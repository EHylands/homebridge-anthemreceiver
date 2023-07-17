import { Service } from 'homebridge';
import { AnthemController} from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';
import { HKAccessory } from './HKAccessory';

export class HKBrightnessAccessory extends HKAccessory {
  private service: Service;
  private PanelBrightnessOn = true;

  constructor(
    protected readonly platform: AnthemReceiverHomebridgePlatform,
    protected readonly Controller: AnthemController,
  ) {
    super(platform,
      Controller,
      'Front Panel',
      Controller.SerialNumber + 'Brightness Accessory');
    this.platform.log.info('Front Panel Brightness');

    this.service = this.Accessory.getService(this.platform.Service.Lightbulb)
    || this.Accessory.addService(this.platform.Service.Lightbulb);

    // set accessory information
    this.Accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Model, Controller.ReceiverModel + ' Brightness Accessory')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, Controller.SerialNumber + ' Brightness');

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.SetPanelOn.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.SetPanelBrightness.bind(this));

    this.Controller.on('PanelBrightnessChange', (Brightness:number)=> {
      this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(Brightness > 0);
      this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(Brightness);
    });

    this.Controller.on('ZonePowerChange', ( ) => {
      // Power off panel accessory if all zone are off
      if(!this.Controller.GetZonePower(1) && !this.Controller.GetZonePower(2)){
        this.PanelBrightnessOn = false;
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
        this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(false);
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

    this.Controller.SetPanelBrightness(value);
  }

  SetPanelOn(value){

    this.PanelBrightnessOn = value;

    // If Zone1 and Zone2 are powered off, cannot change accessory stage
    if(!this.Controller.GetZonePower(1) && !this.Controller.GetZonePower(2)){
      this.platform.log.error('Brightness Accessory' +': Cannot change status, zone are not powered on');
      setTimeout(() => {
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
        this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(0);
      }, 100);
      return;
    }

    if(!this.PanelBrightnessOn){
      this.SetPanelBrightness(0);
    } else{
      this.SetPanelBrightness(100);
    }
  }
}