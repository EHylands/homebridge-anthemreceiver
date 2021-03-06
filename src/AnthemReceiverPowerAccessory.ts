import { PlatformAccessory, Service } from 'homebridge';
import { AnthemController} from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';

export class AnthemReceiverPowerAccessory {
  private service: Service;

  constructor(
    private readonly platform: AnthemReceiverHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly Controller: AnthemController,
    private readonly ZoneNumber: number,
  ) {
    this.platform.log.info('Power Accessory: Zone' + ZoneNumber);
    const ZoneIndex = this.Controller.GetZoneIndex(ZoneNumber);

    this.service = this.accessory.getService(this.platform.Service.Switch)
    || this.accessory.addService(this.platform.Service.Switch);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Anthem')
      .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' Power Accessory')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' Power')
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, Controller.SoftwareVersion);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.SetPower.bind(this));

    // Handle ZonePowerChange event from controller
    this.Controller.on('ZonePowerChange', (Zone: number, ZoneIndex: number, Power:boolean) => {
      if(this.ZoneNumber === Zone){
        this.HandlePowerEvent(Power);
      }
    });

    // Set initial State
    this.HandlePowerEvent(this.Controller.GetZonePower(ZoneIndex));
  }

  HandlePowerEvent(Power:boolean){
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(Power);
  }

  SetPower(value){
    const ZoneIndex = this.Controller.GetZoneIndex(this.ZoneNumber);
    this.Controller.PowerZone(ZoneIndex, value);
  }
}
