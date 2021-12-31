import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { AnthemReceiverPowerInputAccessory } from './AnthemReceiverPowerInputAccessory';
import { AnthemReceiverMuteAccessory } from './AnthemReceiverMuteAccessory';
import { AnthemReceiverPowerAccessory } from './AnthemReceiverPowerAccessory';
import { AnthemReceiverInputAccessory } from './AnthemReceiverInputAccessory';
import { AnthemReceiverALMAccessory } from './AnthemReceiverALMAccessory';
import { AnthemController, AnthemControllerError } from './AnthemController';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

export class AnthemReceiverHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory[] = [];
  private CreatedAccessories: PlatformAccessory[] = [];

  private Controller:AnthemController;

  private Zone1Active = false;
  private Zone2Active = false;
  private Zone1Name = 'Zone 1';
  private Zone2Name = 'Zone 2';
  private Zone1Mute = false;
  private Zone2Mute = false;
  private Zone1Power = false;
  private Zone2Power = false;
  private Zone1ALM = false;
  private Zone1Input = false;
  private Zone2Input = false;

  private Port = '14999';
  private ReconnectTimeout = 30000;
  private InitialRun = true;
  private IsRunning = false;

  private AnthemReceiverPowerInputArray: AnthemReceiverPowerInputAccessory[];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.Controller = new AnthemController();
    this.AnthemReceiverPowerInputArray = [];

    this.api.on('didFinishLaunching', () => {
      log.debug('Finished initializing platform');

      // Do not start plugin if errors has been found in config file
      if(this.CheckConfigFile()){

        if(!this.Controller.AddControllingZone(1, this.Zone1Name, true)){
          this.log.error('Error adding zone 1 to controller');
        }

        if(!this.Controller.AddControllingZone(2, this.Zone2Name, false)){
          this.log.error('Error adding zone 2 to controller');
        }

        // Start operation when controller is ready
        this.Controller.on('ControllerReadyForOperation', () => {
          this.DumpControllerInfo();

          if(this.InitialRun){
            this.discoverDevices();
            this.InitialRun = false;
          }

          this.log.info('-----------------------------------------');
          this.log.info('Starting Controller Operation');
          this.log.info('-----------------------------------------');

          this.IsRunning = true;

        });

        this.Controller.on('ShowDebugInfo', (DebugString) => {
          this.log.debug(DebugString);
        });

        this.Controller.on('InputChange', (InputArray)=>{
          this.log.info('Discovered new inputs');
          for(let i = 1 ; i <= InputArray.length; i++){
            this.log.info('Input' + i + ': ' + InputArray[i-1]);
          }

          for(let i = 0 ; i < this.AnthemReceiverPowerInputArray.length ; i++){
            this.AnthemReceiverPowerInputArray[i].SetInputs(InputArray);
          }
        });

        // Configure Controller Error Event
        this.ConfigureControllerError();

        this.Controller.Connect(this.config.Host, this.config.Port);
      }
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  private DeviceCacheCleanUp(){
    // Do some cleanup of point that have been restored and are not in config file anymore
    for(let i = 0; i< this.accessories.length;i++){
      if(this.CreatedAccessories.indexOf(this.accessories[i]) === -1){
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.accessories[i]]);
      }
    }
  }

  discoverDevices() {

    this.log.info('-----------------------------------------');
    this.log.info('Configuring Hombebridge Plugin');
    this.log.info('-----------------------------------------');

    const Inputs = this.Controller.GetInputs();

    if(this.Zone1Active){
      const AnthemReceiver = new AnthemReceiverPowerInputAccessory(this, this.Controller, 1);
      this.AnthemReceiverPowerInputArray.push(AnthemReceiver);
      AnthemReceiver.SetInputs(Inputs);
    }

    if(this.Zone2Active){
      const AnthemReceiver2 = new AnthemReceiverPowerInputAccessory(this, this.Controller, 2);
      this.AnthemReceiverPowerInputArray.push(AnthemReceiver2);
      AnthemReceiver2.SetInputs(Inputs);
    }

    if(this.Zone1Active || this.Zone2Active){
      this.log.info('Plugin Source Inputs Number: ' + Inputs.length);
      for(let i = 0 ; i < Inputs.length ; i ++){
        this.log.info(' -Input' + (i + 1) + ': ' + Inputs[i]);
      }
    }

    if(this.Zone1Mute){
      this.AddMuteAccessory(1);
    }

    if(this.Zone2Mute){
      this.AddMuteAccessory(2);
    }

    if(this.Zone1Power){
      this.AddPowerAccessory(1);
    }

    if(this.Zone2Power){
      this.AddPowerAccessory(2);
    }

    if(this.Zone1Input){
      this.AddInputAccessory(1);
    }

    if(this.Zone2Input){
      this.AddInputAccessory(2);
    }

    if(this.Zone1ALM){
      this.AddALMAccessory(1);
    }

    this.DeviceCacheCleanUp();
  }

  AddALMAccessory(ZoneNumber: number){
    const uuid = this.api.hap.uuid.generate(this.Controller.SerialNumber + ZoneNumber + 'ALM Accessory');
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      new AnthemReceiverALMAccessory(this, existingAccessory, this.Controller, ZoneNumber);
      this.CreatedAccessories.push(existingAccessory);
    } else{
      const accessory = new this.api.platformAccessory('Zone' + ZoneNumber + ' ALM', uuid);
      this.CreatedAccessories.push(accessory);
      new AnthemReceiverALMAccessory(this, accessory, this.Controller, ZoneNumber);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.CreatedAccessories.push(accessory);
    }
  }

  AddMuteAccessory(ZoneNumber: number){
    const uuid = this.api.hap.uuid.generate(this.Controller.SerialNumber + ZoneNumber + 'Mute Accessory');
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      new AnthemReceiverMuteAccessory(this, existingAccessory, this.Controller, ZoneNumber);
      this.CreatedAccessories.push(existingAccessory);
    } else{
      const accessory = new this.api.platformAccessory('Zone' + ZoneNumber + ' Mute', uuid);
      this.CreatedAccessories.push(accessory);
      new AnthemReceiverMuteAccessory(this, accessory, this.Controller, ZoneNumber);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.CreatedAccessories.push(accessory);
    }
  }

  AddPowerAccessory(ZoneNumber:number){
    const uuid = this.api.hap.uuid.generate(this.Controller.SerialNumber + ZoneNumber + 'Power Accessory');
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      new AnthemReceiverPowerAccessory(this, existingAccessory, this.Controller, ZoneNumber);
      this.CreatedAccessories.push(existingAccessory);
    } else{
      const accessory = new this.api.platformAccessory('Zone' + ZoneNumber + ' Power', uuid);
      this.CreatedAccessories.push(accessory);
      new AnthemReceiverPowerAccessory(this, accessory, this.Controller, ZoneNumber);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.CreatedAccessories.push(accessory);
    }
  }

  AddInputAccessory(ZoneNumber:number){
    const uuid = this.api.hap.uuid.generate(this.Controller.SerialNumber + ZoneNumber + 'Input Accessory');
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      new AnthemReceiverInputAccessory(this, existingAccessory, this.Controller, ZoneNumber);
      this.CreatedAccessories.push(existingAccessory);
    } else{
      const accessory = new this.api.platformAccessory('Zone' + ZoneNumber + ' Input', uuid);
      this.CreatedAccessories.push(accessory);
      new AnthemReceiverInputAccessory(this, accessory, this.Controller, ZoneNumber);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.CreatedAccessories.push(accessory);
    }
  }

  private CheckConfigFile():boolean{

    // Do not start plugin if no host is defined in config file
    if(this.config.Host === undefined){
      this.log.error('Error reading Host from config file');
      return false;
    }

    // Warn if no port has been defined in config file, use default value
    if(this.config.Port === undefined){
      this.Port = this.config.Port;
      this.log.info('Error reading Port from config file, using default value: ' + this.Port);
    }

    if(this.config.Zone1.Active !== undefined){
      this.Zone1Active = this.config.Zone1.Active;
    }

    if(this.config.Zone2.Active !== undefined){
      this.Zone2Active = this.config.Zone2.Active;
    }

    if(this.config.Zone1.Name !== undefined){
      this.Zone1Name = this.config.Zone1.Name;
    }

    if(this.config.Zone2.Name !== undefined){
      this.Zone2Name = this.config.Zone2.Name;
    }

    if(this.config.Zone1.Mute !== undefined){
      this.Zone1Mute = this.config.Zone1.Mute;
    }

    if(this.config.Zone2.Mute !== undefined){
      this.Zone2Mute = this.config.Zone2.Mute;
    }

    if(this.config.Zone1.Power !== undefined){
      this.Zone1Power = this.config.Zone1.Power;
    }

    if(this.config.Zone2.Power !== undefined){
      this.Zone2Power = this.config.Zone2.Power;
    }

    if(this.config.Zone1.Input !== undefined){
      this.Zone1Input = this.config.Zone1.Input;
    }

    if(this.config.Zone2.Input !== undefined){
      this.Zone2Input = this.config.Zone2.Input;
    }

    if(this.config.Zone1.ALM !== undefined){
      this.Zone1ALM = this.config.Zone1.ALM;
    }

    return true;
  }

  private DumpControllerInfo(){
    this.log.info('-----------------------------------------');
    this.log.info('Anthem Receiver Controller Information');
    this.log.info('-----------------------------------------');
    this.log.info('Model: ' + this.Controller.ReceiverModel);
    this.log.info('Serial Number: ' + this.Controller.SerialNumber);
    this.log.info('Software Version: ' + this.Controller.SoftwareVersion);

    this.log.info('Controlling ' + this.Controller.GetConfiguredZoneNumber() +' Zones');
    for(let i = 0 ; i < this.Controller.GetConfiguredZoneNumber() ; i++ ){
      this.log.info(' ' + (i+1) + ': ' + this.Controller.GetZoneName(i));
    }
  }

  ConfigureControllerError(){

    this.Controller.on('ControllerError', (Error, ErrorString) => {

      if(Error === AnthemControllerError.COMMAND_NOT_SUPPORTED){
        this.log.error(Error + ': ' + ErrorString);
        return;
      }

      if(Error === AnthemControllerError.INVALID_MODEL_STRING_RECEIVED){
        this.log.error(Error + ': ' + ErrorString + ',  Assuming model MRX 740 for debug purpose');
        return;
      }

      // Try to reconnect if network error
      if(Error === AnthemControllerError.CONNECTION_ERROR){
        this.log.error(Error + ': ' + ErrorString);
        if(this.IsRunning){
          this.log.info('-----------------------------------------');
          this.log.info('Stopping Controller Operation');
          this.log.info('-----------------------------------------');
        }
        this.IsRunning = false;

        setTimeout(() => {
          this.log.info('Trying to reconnect ....');
          this.Controller.Connect(this.config.Host, this.config.Port);
        }, this.ReconnectTimeout);
      }
    });
  }
}