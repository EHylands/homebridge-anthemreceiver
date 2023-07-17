import { Service } from 'homebridge';
import { AnthemController} from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';
import { HKAccessory } from './HKAccessory';


export class HKPowerAccessory extends HKAccessory {
  private service: Service;

  constructor(
    protected readonly platform: AnthemReceiverHomebridgePlatform,
    protected readonly Controller: AnthemController,
    protected readonly ZoneNumber: number,
  ) {
    super(platform,
      Controller,
      'Zone' + ZoneNumber + ' Power',
      Controller.SerialNumber + ZoneNumber + 'Power Accessory');

    this.platform.log.info('Zone' + ZoneNumber + ': Power');
    this.service = this.Accessory.getService(this.platform.Service.Switch) || this.Accessory.addService(this.platform.Service.Switch);

    this.Accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel+ ' Power Accessory')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber+ ' Power');


    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.SetPower.bind(this));

    // Handle ZonePowerChange event from controller
    this.Controller.on('ZonePowerChange', (Zone: number, Power:boolean) => {
      if(this.ZoneNumber === Zone){
        this.HandlePowerEvent(Power);
      }
    });

    // Set initial State
    this.HandlePowerEvent(this.Controller.GetZonePower(ZoneNumber));
  }

  HandlePowerEvent(Power:boolean){
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(Power);
  }

  SetPower(value){
    this.Controller.PowerZone(this.ZoneNumber, value);
  }

}
