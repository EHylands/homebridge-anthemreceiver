import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { HKPowerInputAccessory } from './HKPowerInputAccessory';
import { HKMuteAccessory } from './HKMuteAccessory';
import { HKPowerAccessory } from './HKPowerAccessory';
import { HKInputAccessoryNG } from './HKInputAccessoryNG';
import { HKALMAccessoryNG } from './HKALMAccessoryNG';
import { HKARCAccessory } from './HKARCAccessory';
import { HKVolumeAccessory } from './HKVolumeAccessory';
import { HKBrightnessAccessory } from './HKBrightnessAccessory';
import { AnthemController, AnthemControllerError } from './AnthemController';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HKDolbyPostProcessingAccessory } from './HKDolbyPostProcessingAccessory';

export class AnthemReceiverHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory[] = [];
  public CreatedAccessories: PlatformAccessory[] = [];

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
  private Zone1MultipleInputs = false;
  private Zone2MultipleInputs =false;
  private Zone1ARC = false;
  private Zone1Volume = false;
  private Zone2Volume = false;
  private Zone1DolbyPostProcessing = false;
  private Zone2DolbyPostProcessing = false;
  private PanelBrightness = false;

  private Port = '14999';
  private ReconnectTimeout = 30000;
  private InitialRun = true;
  private IsRunning = false;

  private AnthemReceiverPowerInputArray: HKPowerInputAccessory[];

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
    // Do some cleanup of accessories that have been restored and are not in config file anymore
    for(let i = 0; i< this.accessories.length;i++){
      if(this.CreatedAccessories.indexOf(this.accessories[i]) === -1){
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.accessories[i]]);
      }
    }
  }

  discoverDevices() {

    this.log.info('-----------------------------------------');
    this.log.info('Configuring Hombebridge Accessories');
    this.log.info('-----------------------------------------');

    const Inputs = this.Controller.GetInputs();

    if(this.PanelBrightness){
      this.AddBrightnessAccessory();
    }

    if(this.Zone1Active){
      const AnthemReceiver = new HKPowerInputAccessory(this, this.Controller, 1);
      this.AnthemReceiverPowerInputArray.push(AnthemReceiver);
      AnthemReceiver.SetInputs(Inputs);
    }

    if(this.Zone1Mute){
      new HKMuteAccessory(this, this.Controller, 1);
    }

    if(this.Zone1Power){
      new HKPowerAccessory(this, this.Controller, 1);
    }

    if(this.Zone1Volume){
      this.ADDVolumeAccessory(1);
    }

    if(this.Zone1MultipleInputs){
      new HKInputAccessoryNG(this, this.Controller, 1);
    }

    if(this.Zone1ARC){
      this.ADDArcAccessory(1);
    }

    if(this.Zone1ALM){
      new HKALMAccessoryNG(this, this.Controller, 1);
    }

    if(this.Zone1DolbyPostProcessing){
      this.AddDolbyPostProcessingAccessory(1);
    }

    if(this.Zone2Active){
      const AnthemReceiver2 = new HKPowerInputAccessory(this, this.Controller, 2);
      this.AnthemReceiverPowerInputArray.push(AnthemReceiver2);
      AnthemReceiver2.SetInputs(Inputs);
    }

    if(this.Zone2Mute){
      new HKMuteAccessory(this, this.Controller, 2);
    }

    if(this.Zone2Power){
      new HKPowerAccessory(this, this.Controller, 2);
    }

    if(this.Zone2MultipleInputs){
      new HKInputAccessoryNG(this, this.Controller, 2);
    }

    if(this.Zone2Volume){
      this.ADDVolumeAccessory(2);
    }

    if(this.Zone2DolbyPostProcessing){
      this.AddDolbyPostProcessingAccessory(2);

    }

    this.DeviceCacheCleanUp();
  }

  private ADDVolumeAccessory(ZoneNumber: number){

    if(!this.Controller.IsProtocolV02()){
      this.log.error('Volume Accessory: Zone' + ZoneNumber + ' Not adding accessory (only supported on X40 Serie)');
      return;
    }

    const uuid = this.api.hap.uuid.generate(this.Controller.SerialNumber + ZoneNumber + 'Volume');
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      new HKVolumeAccessory(this, existingAccessory, this.Controller, ZoneNumber);
      this.CreatedAccessories.push(existingAccessory);
    } else{
      const accessory = new this.api.platformAccessory('Zone' + ZoneNumber + ' Volume', uuid);
      new HKVolumeAccessory(this, accessory, this.Controller, ZoneNumber);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.CreatedAccessories.push(accessory);
    }
  }

  private ADDArcAccessory(ZoneNumber: number){
    const uuid = this.api.hap.uuid.generate(this.Controller.SerialNumber + ZoneNumber + 'ARC');
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      new HKARCAccessory(this, existingAccessory, this.Controller, ZoneNumber);
      this.CreatedAccessories.push(existingAccessory);
    } else{
      const accessory = new this.api.platformAccessory('Zone' + ZoneNumber + ' ARC', uuid);
      new HKARCAccessory(this, accessory, this.Controller, ZoneNumber);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.CreatedAccessories.push(accessory);
    }
  }

  AddBrightnessAccessory(){

    if(!this.Controller.IsProtocolV02()){
      this.log.error('Panel Brightness Accessory: Not adding accessory (only supported on X40 Serie)');
      return;
    }

    const uuid = this.api.hap.uuid.generate(this.Controller.SerialNumber + 'Brightness Accessory');
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      new HKBrightnessAccessory(this, existingAccessory, this.Controller);
      this.CreatedAccessories.push(existingAccessory);
    } else{
      const accessory = new this.api.platformAccessory('Front Panel', uuid);
      new HKBrightnessAccessory(this, accessory, this.Controller);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.CreatedAccessories.push(accessory);
    }
  }

  AddDolbyPostProcessingAccessory(Zone:number){
    if(!this.Controller.IsProtocolV02()){
      this.log.error('Dolbpy Post-Processing Accessory: Not adding accessory (only supported on X40 Serie)');
      return;
    }

    new HKDolbyPostProcessingAccessory(this, this.Controller, Zone);
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

    if(this.config.Zone1.MultipleInputs !== undefined){
      this.Zone1MultipleInputs = this.config.Zone1.MultipleInputs;
    }

    if(this.config.Zone2.MultipleInputs !== undefined){
      this.Zone2MultipleInputs = this.config.Zone2.MultipleInputs;
    }

    if(this.config.Zone1.ALM !== undefined){
      this.Zone1ALM = this.config.Zone1.ALM;
    }

    if(this.config.Zone1.ARC !== undefined){
      this.Zone1ARC = this.config.Zone1.ARC;
    }

    if(this.config.Zone1.Volume !== undefined){
      this.Zone1Volume = this.config.Zone1.Volume;
    }

    if(this.config.Zone2.Volume !== undefined){
      this.Zone2Volume = this.config.Zone2.Volume;
    }

    if(this.config.PanelBrightness !== undefined){
      this.PanelBrightness = this.config.PanelBrightness;
    }

    if(this.config.Zone1.DolbyPostProcessing !== undefined){
      this.Zone1DolbyPostProcessing = this.config.Zone1.DolbyPostProcessing;
    }

    if(this.config.Zone2.DolbyPostProcessing !== undefined){
      this.Zone2DolbyPostProcessing = this.config.Zone2.DolbyPostProcessing;
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

    this.log.info('Zones: ' + this.Controller.GetConfiguredZoneNumber());
    for(const ZoneNumber in this.Controller.GetZones()){
      const Zone = this.Controller.GetZones()[ZoneNumber];
      this.log.info(' Zone:' + ZoneNumber + ': ' + Zone.ZoneName);
    }

    const Inputs = this.Controller.GetInputs();

    this.log.info('Inputs: ' + Inputs.length);
    for(let i = 0 ; i < Inputs.length ; i ++){
      this.log.info(' Input' + (i + 1) + ': ' + Inputs[i]);
    }
  }

  ConfigureControllerError(){

    this.Controller.on('ControllerError', (Error, ErrorString) => {

      this.log.error(Error + ': ' + ErrorString);

      if(Error === AnthemControllerError.COMMAND_NOT_SUPPORTED){
        return;
      }

      if(Error === AnthemControllerError.INVALID_MODEL_STRING_RECEIVED){
        this.log.error('Assuming model MRX 740 for debug purpose');
        return;
      }

      // Try to reconnect if network error
      if(Error === AnthemControllerError.CONNECTION_ERROR){
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