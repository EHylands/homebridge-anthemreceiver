import { PlatformAccessory, Service } from 'homebridge';
import { AnthemController} from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';

export class HKInputAccessory {
  private service: Service;

  constructor(
    private readonly platform: AnthemReceiverHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly Controller: AnthemController,
    private readonly ZoneNumber: number,
  ) {
    this.platform.log.info('Input Accessory: Zone' + ZoneNumber);

    this.service = this.accessory.getService(this.platform.Service.Switch)
    || this.accessory.addService(this.platform.Service.Switch);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Anthem')
      .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' Input Accessory')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' Input')
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, Controller.SoftwareVersion);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.SwitchInput.bind(this));
  }

  SwitchInput(){
    const Zone = this.Controller.GetZones()[this.ZoneNumber];

    setTimeout(() => {
      this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
    }, 100);

    // Input can only be changed set on a powered zone
    if(Zone.GetIsPowered()){
      this.Controller.SwitchInput(this.ZoneNumber);
    } else{
      this.platform.log.error('Zone' + this.ZoneNumber +': Cannot switch input, zone is not powered on');

    }
  }
}
