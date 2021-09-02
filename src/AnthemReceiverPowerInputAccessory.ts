import { Service } from 'homebridge';
import { AnthemController } from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';
import { PLUGIN_NAME } from './settings';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class AnthemReceiverPowerInputAccessory {
  private service: Service;

  constructor(
    private readonly platform: AnthemReceiverHomebridgePlatform,
    //  private readonly accessory: PlatformAccessory,
    private readonly Controller: AnthemController,
    private readonly ZoneIndex: number,
  ) {

    this.ZoneIndex = ZoneIndex;
    const Name = this.Controller.GetZoneName(this.ZoneIndex);

    const uuid = this.platform.api.hap.uuid.generate('Anthem_Receiver' + this.Controller.ReceiverModel +
    this.Controller.SerialNumber + this.Controller.GetZone(ZoneIndex));
    const ReceiverAccessory = new this.platform.api.platformAccessory(Name, uuid);
    ReceiverAccessory.category = this.platform.api.hap.Categories.TELEVISION;
    this.service = ReceiverAccessory.addService(this.platform.Service.Television);
    this.service.setCharacteristic(this.platform.Characteristic.ConfiguredName, Name);
    this.service.setCharacteristic(this.platform.Characteristic.SleepDiscoveryMode,
      this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

    // set accessory information
    ReceiverAccessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Anthem')
      .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, Controller.SoftwareVersion);

    // Initialise plugin
    this.service.setCharacteristic(this.platform.Characteristic.ActiveIdentifier,
      this.Controller.GetActiveInputForZoneIndex(this.ZoneIndex));
    this.service.setCharacteristic(this.platform.Characteristic.Active, this.Controller.GetZonePower(this.ZoneIndex));

    // Send change from homekit to Anthem Receiver - Power
    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet((newValue) => {
        this.Controller.PowerZone(this.ZoneIndex, newValue === 1);
      });

    // Send change from homekit to Anthem Receiver - Active input
    this.service.getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
      .onSet((newValue) => {
        this.Controller.SetZoneInput(this.ZoneIndex, Number(newValue));
      });

    // Configure inputs names
    for (let i = 0; i < this.Controller.GetNumberOfInput() ; i++){
      const hdmiInputService = ReceiverAccessory.addService(this.platform.Service.InputSource, 'hdmi'+(i+1), 'HDMI '+ (i+1));
      hdmiInputService
        .setCharacteristic(this.platform.Characteristic.Identifier, (i+1))
        .setCharacteristic(this.platform.Characteristic.ConfiguredName, this.Controller.GetInputName(i))
        .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
        .setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.HDMI);
      this.service.addLinkedService(hdmiInputService);
    }

    this.Controller.on('ZonePowerChange', (Zone: number, ZoneIndex: number, Power: boolean) => {
      if(this.ZoneIndex === ZoneIndex){
        this.service.updateCharacteristic(this.platform.Characteristic.Active, Power);
      }
    });

    this.Controller.on('ZoneInputChange', (Zone: number, ZoneIndex: number, Input: number) => {
      if(this.ZoneIndex === ZoneIndex){
        this.service.updateCharacteristic(this.platform.Characteristic.ActiveIdentifier, Input);
      }
    });

    //this.Controller.on('InputNameChange', (Input, Name) =>{
    //  // Todo, manage how to chaange input name
    //});

    this.platform.api.publishExternalAccessories(PLUGIN_NAME, [ReceiverAccessory]);
  }

  GetZoneIndex(){
    return this.ZoneIndex;
  }
}
