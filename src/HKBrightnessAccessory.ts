import { PlatformAccessory, Service } from 'homebridge';
import { AnthemController} from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';

export class HKBrightnessAccessory {
  private service: Service;
  private PanelBrightnessOn = true;
  private PanelBrightnessLevel = 0;

  constructor(
    private readonly platform: AnthemReceiverHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly Controller: AnthemController,
  ) {
    this.platform.log.info('Brightness Accessory');

    this.service = this.accessory.getService(this.platform.Service.Lightbulb)
    || this.accessory.addService(this.platform.Service.Lightbulb);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Anthem')
      .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' Brightness Accessory')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' Brightness')
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, Controller.SoftwareVersion);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.SetPanelOn.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.SetPanelBrightness.bind(this));

    this.Controller.on('PanelBrightnessChange', (Brightness:number)=> {

      this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(Brightness);
      this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(Brightness>0);
    });

    this.Controller.on('ZonePowerChange', ( ) => {
      // Power off panel accessory if all zone are oof
      if(!this.Controller.GetZonePower(1) && !this.Controller.GetZonePower(2)){
        this.PanelBrightnessOn = false;
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
        this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(0);
      }
    });
  }

  SetPanelBrightness(value){

    // If Zone1 and Zone2 are powered off, cannot change brightness level
    if(!this.Controller.GetZonePower(1) && !this.Controller.GetZonePower(2)){
      this.platform.log.error('Brightness Accessory' +': Cannot change brightness level, zone are not powered on');
      setTimeout(() => {
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
        this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(0);
      }, 100);
      return;
    }

    if(this.PanelBrightnessOn){
      this.PanelBrightnessLevel = value;
    }

    this.Controller.SetPanelBrightness(value);
  }

  SetPanelOn(value){

    // If Zone1 and Zone2 are powered off, cannot change accessory stage
    if(!this.Controller.GetZonePower(1) && !this.Controller.GetZonePower(2)){
      this.platform.log.error('Brightness Accessory' +': Cannot change status, zone are not powered on');
      setTimeout(() => {
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
        this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(0);
      }, 100);
      return;
    }

    this.PanelBrightnessOn = value;

    if(this.PanelBrightnessOn){
      this.SetPanelBrightness(this.PanelBrightnessLevel);
    } else{
      this.SetPanelBrightness(0);
    }
  }


}