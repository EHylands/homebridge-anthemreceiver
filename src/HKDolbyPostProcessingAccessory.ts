import { AnthemController} from './AnthemController';
import { HKAccessory } from './HKAccessory';
import { AnthemReceiverHomebridgePlatform } from './platform';

export class HKDolbyPostProcessingAccessory extends HKAccessory {

  constructor(
    protected readonly platform: AnthemReceiverHomebridgePlatform,
    protected readonly Controller: AnthemController,
    private readonly ZoneNumber: number,
  ){
    const Name = 'Zone' + ZoneNumber + ' Dolby Mode';
    const UUID = Controller.SerialNumber + ZoneNumber + 'Dolby Post Processing';
    super(platform, Controller, Name, UUID);
    this.platform.log.info('Zone' + ZoneNumber + ': Audio Dolby Processing');

    // Create service list
    const DPP = [
      'Off',
      'Movie',
      'Music',
      'Night',
    ];

    for(let i = 0 ; i < DPP.length ; i ++){
      const service = this.AddService(this.platform.Service.Switch, DPP[i], DPP[i]);

      service.getCharacteristic(this.platform.Characteristic.On).onSet((Value) => {

        if(!this.Controller.GetZonePower(this.ZoneNumber)){
          setTimeout(() => {
            service.getCharacteristic(this.platform.Characteristic.On).updateValue((false));
          }, 100);
          return;
        }

        if(Value){
          this.Controller.SetDolbyPostProcessing(this.ZoneNumber, i);
        } else{
          setTimeout(() => {
            service.getCharacteristic(this.platform.Characteristic.On).updateValue((true));
          }, 100);
        }
      });

    }
    Controller.on('ZoneDolbyPostProcessingChange', (Zone: number, DolbyAudioMode: number) => {
      if(this.ZoneNumber === Zone){

        // Update all switch
        for(let i = 0 ; i < DPP.length ; i++){
          const service = this.Accessory.getServiceById(this.platform.Service.Switch, DPP[i]);
          if(service !== undefined){
            service.getCharacteristic(this.platform.Characteristic.On).updateValue(((i) === DolbyAudioMode));
          }
        }
      }
    });

    // Handle ZonePowerChange event from controller
    this.Controller.on('ZonePowerChange', (Zone: number, Power:boolean) => {
      if(this.ZoneNumber === Zone){
        for(let i = 0 ; i < DPP.length ; i++){
          const service = this.Accessory.getServiceById(this.platform.Service.Switch, DPP[i]);
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


