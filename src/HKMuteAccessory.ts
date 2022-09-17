import { PlatformAccessory, Service } from 'homebridge';
import { AnthemController} from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';

export class HKMuteAccessory {
  private service: Service;

  constructor(
    private readonly platform: AnthemReceiverHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly Controller: AnthemController,
    private readonly ZoneNumber: number,
  ) {
    this.platform.log.info('Mute Accessory: Zone' + ZoneNumber);

    this.service = this.accessory.getService(this.platform.Service.Switch)
    || this.accessory.addService(this.platform.Service.Switch);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Anthem')
      .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' Mute Accessory')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' Mute')
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, Controller.SoftwareVersion);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.SetMute.bind(this));

    // Handle ZoneMutedChange event from controller
    this.Controller.on('ZoneMutedChange', (Zone: number, Muted:boolean) => {
      if(this.ZoneNumber === Zone){
        this.HandleMuteEvent(Muted);
      }
    });

    // Handle ZonePowerChange event from controller
    // Disable mute accessory when zone is powered off
    this.Controller.on('ZonePowerChange', (Zone: number, Power:boolean) => {
      if(this.ZoneNumber === Zone && !Power){
        this.HandleMuteEvent(false);
        // insert timer ....
      }
    });
  }

  HandleMuteEvent(Mute:boolean){
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(Mute);
  }

  SetMute(value){

    // Mute can only be set on a powered zone
    if(this.Controller.GetZonePower(this.ZoneNumber)){
      this.Controller.SetMute(this.ZoneNumber, value);
    } else{
      this.platform.log.error('Zone' + this.ZoneNumber +': Cannot set mute, zone is not powered on');
      setTimeout(() => {
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
      }, 100);
    }
  }
}