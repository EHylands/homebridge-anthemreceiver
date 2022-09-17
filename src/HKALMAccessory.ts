import { PlatformAccessory, Service } from 'homebridge';
import { AnthemController} from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';

export class HKALMAccessory {
  private service: Service;

  constructor(
    private readonly platform: AnthemReceiverHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly Controller: AnthemController,
    private readonly ZoneNumber: number,
  ) {
    this.platform.log.info('ALM Accessory: Zone' + ZoneNumber);

    this.service = this.accessory.getService(this.platform.Service.Switch)
    || this.accessory.addService(this.platform.Service.Switch);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Anthem')
      .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' ALM Accessory')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' ALM')
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, Controller.SoftwareVersion);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.SwitchALM.bind(this));
  }

  SwitchALM(){
    const Zone = this.Controller.GetZones()[this.ZoneNumber];

    setTimeout(() => {
      this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
    }, 100);

    if(Zone.GetIsPowered()){
      if(Zone.GetIsMainZone()){
        this.Controller.ToggleAudioListeningMode(this.ZoneNumber, true);
      } else{
        this.platform.log.error('Zone' + this.ZoneNumber +': Cannot toggle audio listenning mode, not main zone');
      }
    } else{
      this.platform.log.error('Zone' + this.ZoneNumber +': Cannot toggle audio listenning mode, zone is not powered on');
    }
  }
}
