import { PlatformAccessory, Service } from 'homebridge';
import { AnthemController} from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';

export class HKARCAccessory {
  private service: Service;

  constructor(
    private readonly platform: AnthemReceiverHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly Controller: AnthemController,
    private readonly ZoneNumber: number,
  ) {
    this.platform.log.info('Zone' + ZoneNumber + ': ARC');

    this.service = this.accessory.getService(this.platform.Service.Switch)
    || this.accessory.addService(this.platform.Service.Switch);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Anthem')
      .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' ARC Accessory')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' ARC')
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, Controller.SoftwareVersion);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.SwitchARC.bind(this));

    this.Controller.on('ZoneARCEnabledChange', (Zone: number, ARCEnabled:boolean)=>{
      if(this.ZoneNumber === Zone){
        this.HandleARCEvent(ARCEnabled);
      }
    });

    this.Controller.on('ZonePowerChange', (Zone: number, Power:boolean) => {
      if(this.ZoneNumber === Zone && !Power){
        this.HandleARCEvent(false);
      }
    });
  }

  private HandleARCEvent(ARCEnabled:boolean){
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(ARCEnabled);
  }

  SwitchARC(Value){
    const Zone = this.Controller.GetZones()[this.ZoneNumber];

    if(!Zone.GetIsPowered()){
      this.platform.log.error('Zone' + this.ZoneNumber +': Cannot toggle ARC, zone is not powered on');
      setTimeout(() => {
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
      }, 100);
      return;
    }

    if(!Zone.GetIsMainZone()){
      this.platform.log.error('Zone' + this.ZoneNumber +': Cannot toggle ARC, not main zone');
      setTimeout(() => {
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
      }, 100);
      return;
    }

    if(!Zone.GetARCConfigured()){
      this.platform.log.error('Zone' + this.ZoneNumber +': Cannot toggle ARC, ARC is not configured');
      setTimeout(() => {
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
      }, 100);
      return;

    }

    this.Controller.SetZoneARCEnabled(this.ZoneNumber, Value);
  }
}
