import { Service } from 'homebridge';
import { AnthemController} from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';
import { HKAccessory } from './HKAccessory';

export class HKMuteAccessory extends HKAccessory {
  private service: Service;

  constructor(
    protected readonly platform: AnthemReceiverHomebridgePlatform,
    protected readonly Controller: AnthemController,
    private readonly ZoneNumber: number,
  ) {
    const Name = 'Zone' + ZoneNumber + ' Mute';
    const UUID = Controller.SerialNumber + ZoneNumber + 'Mute Accessory';
    super(platform, Controller, Name, UUID);
    this.platform.log.info('Zone' + ZoneNumber + ': Mute');

    this.service = this.Accessory.getService(this.platform.Service.Switch)
    || this.Accessory.addService(this.platform.Service.Switch);

    this.Accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' Mute Accessory')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' Mute');

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