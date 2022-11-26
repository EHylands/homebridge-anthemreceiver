import { PlatformAccessory, Service } from 'homebridge';
import { AnthemController} from './AnthemController';
import { HKAccessory } from './HKAccessory';
import { AnthemReceiverHomebridgePlatform } from './platform';

export class HKInputsAccessory extends HKAccessory {

  constructor(
    protected readonly platform: AnthemReceiverHomebridgePlatform,
    protected readonly Controller: AnthemController,
    private readonly ZoneNumber: number,
  ){

    super(platform, Controller, 'Zone' + ZoneNumber + ' Inputs');
    this.platform.log.info('Input Selector Accessory: Zone' + ZoneNumber);


    // Remove all service
    //for(let i = 0 ; i < this.Accessory.services.length ; i++){
    //  const service = this.Accessory.services[i];
    //
    //  if(service.UUID === this.platform.Service.Switch.UUID){
    //    this.Accessory.removeService(service);
    //  }
    //}

    // Create service list
    const Inputs = Controller.GetInputs();
    for(let i = 0 ; i < Inputs.length ; i++){
      const service = this.AddService(this.platform.Service.Switch, 'Input' + (i+1) + ' ' + Inputs[i], 'Input' + i);
      service.getCharacteristic(this.platform.Characteristic.On).onSet((Value) => {
        if(Value){
          this.Controller.SetZoneInput(this.ZoneNumber, (i+1));
        } else{
          setTimeout(() => {
            service.getCharacteristic(this.platform.Characteristic.On).updateValue((true));
          }, 100);
        }
      });
    }

    this.Controller.on('ZoneInputChange', (Zone: number, Input: number) => {
      if(this.ZoneNumber === Zone){

        // Update all switch
        for(let i = 0 ; i < Inputs.length ; i++){
          const Index = i + 1;
          const service = this.Accessory.getServiceById(this.platform.Service.Switch, 'Input'+i);
          if(service !== undefined){
            service.getCharacteristic(this.platform.Characteristic.On).updateValue((Index === Input));
          }
        }
      }
    });
  }

  protected CreateUUID(): string {
    return this.Controller.SerialNumber + this.ZoneNumber + 'Input Selector';
  }
}