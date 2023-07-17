import { Service } from 'homebridge';
import { AnthemController} from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';
import { HKAccessory } from './HKAccessory';

export class HKVolumeAccessory extends HKAccessory {
  private service: Service;

  constructor(
    protected readonly platform: AnthemReceiverHomebridgePlatform,
    protected readonly Controller: AnthemController,
    private readonly ZoneNumber: number,
  ) {
    super(platform,
      Controller,
      'Zone' + ZoneNumber + ' Volume',
      Controller.SerialNumber + ZoneNumber + 'Volume');
    this.platform.log.info('Zone' + ZoneNumber + ': Volume');

    this.service = this.Accessory.getService(this.platform.Service.Lightbulb)
    || this.Accessory.addService(this.platform.Service.Lightbulb);

    // set accessory information
    this.Accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' Volume Accessory')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' Volume');

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