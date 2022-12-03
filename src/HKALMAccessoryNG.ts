import { AnthemController} from './AnthemController';
import { HKAccessory } from './HKAccessory';
import { AnthemReceiverHomebridgePlatform } from './platform';

export class HKALMAccessoryNG extends HKAccessory {

  constructor(
    protected readonly platform: AnthemReceiverHomebridgePlatform,
    protected readonly Controller: AnthemController,
    private readonly ZoneNumber: number,
  ){

    super(platform, Controller, 'Zone' + ZoneNumber + ' ALM');
    this.platform.log.info('Audio Listenning Mode (new): Zone' + ZoneNumber);

    // Create service list
    const ALM = this.Controller.GetALMArray();

    for(let i = 0 ; i < ALM.length ; i ++){
      const service = this.AddService(this.platform.Service.Switch, ALM[i], ALM[i]);

      service.getCharacteristic(this.platform.Characteristic.On).onSet((Value) => {

        if(!this.Controller.GetZonePower(this.ZoneNumber)){
          setTimeout(() => {
            service.getCharacteristic(this.platform.Characteristic.On).updateValue((false));
          }, 100);
          return;
        }

        if(Value){
          this.Controller.SetAudioListeningMode(this.ZoneNumber, i);
        } else{
          setTimeout(() => {
            service.getCharacteristic(this.platform.Characteristic.On).updateValue((true));
          }, 100);
        }
      });

    }
    Controller.on('ZoneALMChange', (Zone: number, AudioMode: number) => {
      if(this.ZoneNumber === Zone){

        // Update all switch
        for(let i = 0 ; i < ALM.length ; i++){
          const service = this.Accessory.getServiceById(this.platform.Service.Switch, ALM[i]);
          if(service !== undefined){
            service.getCharacteristic(this.platform.Characteristic.On).updateValue(((i+1) === AudioMode));
          }
        }
      }
    });

    // Handle ZonePowerChange event from controller
    this.Controller.on('ZonePowerChange', (Zone: number, Power:boolean) => {
      if(this.ZoneNumber === Zone){
        for(let i = 0 ; i < ALM.length ; i++){
          const service = this.Accessory.getServiceById(this.platform.Service.Switch, ALM[i]);
          if(service !== undefined){
            if(!Power){
              service.getCharacteristic(this.platform.Characteristic.On).updateValue((false));
            }
          }
        }
      }
    });
  }

  protected CreateUUID(): string {
    return this.Controller.SerialNumber + this.ZoneNumber + 'ALM NG';
  }
}


