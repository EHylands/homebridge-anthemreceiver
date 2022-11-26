import { PlatformAccessory, Service, WithUUID } from 'homebridge';
import { AnthemController} from './AnthemController';
import { AnthemReceiverHomebridgePlatform } from './platform';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

export abstract class HKAccessory {
    public readonly Accessory: PlatformAccessory;

    constructor(
        protected readonly platform: AnthemReceiverHomebridgePlatform,
        protected readonly Controller: AnthemController,
        protected readonly Name:string,
    ) {

      const uuid = this.platform.api.hap.uuid.generate(this.CreateUUID());
      let accessory = this.platform.accessories.find(accessory => accessory.UUID === uuid);
      if(accessory){
        this.platform.api.updatePlatformAccessories([accessory]);
      } else{
        accessory = new this.platform.api.platformAccessory(this.Name, uuid);
        this.platform.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
      platform.CreatedAccessories.push(accessory);
      this.Accessory = accessory;
    }

    protected abstract CreateUUID(): string;

    protected AddService(Type: WithUUID<typeof Service>, Name:string, Subtype?:string){

      let service: Service | undefined;
      if (Subtype) {
        service = this.Accessory.getServiceById(Type, Subtype);
      } else {
        service = this.Accessory.getService(Type);
      }

      return service || this.Accessory.addService(Type, Name, Subtype);
    }

}