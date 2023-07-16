import { PlatformAccessory, Service } from 'homebridge';
import { AnthemController} from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';

export class HKVolumeAccessory {
  private service: Service;

  constructor(
    private readonly platform: AnthemReceiverHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly Controller: AnthemController,
    private readonly ZoneNumber: number,
  ) {
    this.platform.log.info('Zone' + ZoneNumber + ': Volume');

    this.service = this.accessory.getService(this.platform.Service.Lightbulb)
    || this.accessory.addService(this.platform.Service.Lightbulb);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Anthem')
      .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' Volume Accessory')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' Volume')
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, Controller.SoftwareVersion);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.SetMute.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.SetBrightness.bind(this));

    // Hande ZoneVolumePercentageChange event from controller
    this.Controller.on('ZoneVolumePercentageChange', (Zone:number, VolumePercentage:number)=> {
      if(this.ZoneNumber === Zone){
        this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(VolumePercentage);
      }
    });

    // Handle ZoneMutedChange event from controller
    this.Controller.on('ZoneMutedChange', (Zone: number, Muted:boolean) => {
      if(this.ZoneNumber === Zone){
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(!Muted);
      }
    });

    // Handle ZonePowerChange event from controller
    // Disable mute accessory when zone is powered off
    this.Controller.on('ZonePowerChange', (Zone: number, Power:boolean) => {
      if(this.ZoneNumber === Zone){
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(Power);
      }
    });
  }

  SetBrightness(value){
    const CurrentVolumePercentage = this.Controller.GetZone(this.ZoneNumber).GetVolumePercentage();

    // Brightness can only be set on a powered zone
    if(this.Controller.GetZonePower(this.ZoneNumber)){
      this.Controller.SetZoneVolumePercentage(this.ZoneNumber, value);
    } else{
      this.platform.log.error('Zone' + this.ZoneNumber +': Cannot set volume percentage, zone is not powered on');
      setTimeout(() => {
        this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(CurrentVolumePercentage);
      }, 100);
    }
  }

  SetMute(value){

    // Mute can only be set on a powered zone
    if(this.Controller.GetZonePower(this.ZoneNumber)){
      this.Controller.SetMute(this.ZoneNumber, !value);
    } else{
      this.platform.log.error('Zone' + this.ZoneNumber +': Cannot set mute, zone is not powered on');
      setTimeout(() => {
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
      }, 100);
    }
  }
}