import { AnthemController} from './AnthemController';
import { HKAccessory } from './HKAccessory';
import { AnthemReceiverHomebridgePlatform } from './platform';


export class HKInputAccessoryNG extends HKAccessory {

  constructor(
    protected readonly platform: AnthemReceiverHomebridgePlatform,
    protected readonly Controller: AnthemController,
    private readonly ZoneNumber: number,
  ){
    const Name = 'Zone' + ZoneNumber + ' Inputs';
    const UUID = Controller.SerialNumber + ZoneNumber + 'Input Selector NG';
    super(platform, Controller, Name, UUID);
    this.platform.log.info('Zone' + ZoneNumber + ': Input Selector');

    // Create service list
    const Inputs = Controller.GetInputs();
    for(let i = 0 ; i < Inputs.length ; i++){
      const service = this.AddService(this.platform.Service.Switch, 'Input' + (i+1) + ' ' + Inputs[i], 'Input' + i);
      service.getCharacteristic(this.platform.Characteristic.On).onSet((Value) => {

        if(!this.Controller.GetZonePower(this.ZoneNumber)){
          setTimeout(() => {
            service.getCharacteristic(this.platform.Characteristic.On).updateValue((false));
          }, 100);
          return;
        }

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

    // Handle ZonePowerChange event from controller
    this.Controller.on('ZonePowerChange', (Zone: number, Power:boolean) => {
      if(this.ZoneNumber === Zone){
        for(let i = 0 ; i < Inputs.length ; i++){
          const service = this.Accessory.getServiceById(this.platform.Service.Switch, 'Input'+i);
          if(service !== undefined){
            if(!Power){
              service.getCharacteristic(this.platform.Characteristic.On).updateValue((false));
            }
          }
        }
      }
    });
  }
}