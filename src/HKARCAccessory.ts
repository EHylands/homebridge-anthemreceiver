import { Service } from 'homebridge';
import { AnthemController} from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';
import { HKAccessory } from './HKAccessory';


export class HKARCAccessory extends HKAccessory{
  private service: Service;

  constructor(
    protected readonly platform: AnthemReceiverHomebridgePlatform,
    protected readonly Controller: AnthemController,
    private readonly ZoneNumber: number,
  ) {
    const Name = 'Zone' + ZoneNumber + ' ARC';
    const UUID = Controller.SerialNumber + ZoneNumber + 'ARC';
    super(platform, Controller, Name, UUID);
    this.platform.log.info('Zone' + ZoneNumber + ': ARC');

    this.service = this.Accessory.getService(this.platform.Service.Switch)
    || this.Accessory.addService(this.platform.Service.Switch);

    // set accessory information
    this.Accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' ARC Accessory')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' ARC');

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
