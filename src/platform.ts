import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { AnthemReceiverPowerInputAccessory } from './AnthemReceiverPowerInputAccessory';
import { AnthemController, AnthemControllerError } from './AnthemController';

export class AnthemReceiverHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  private Controller:AnthemController;
  private Zone1Active = false;
  private Zone2Active = false;
  private Zone1Name = 'Anthem Zone 1';
  private Zone2Name = 'Anthem Zone 2';
  private Port = '14999';
  private ReconnectTimeout = 30000;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.Controller = new AnthemController();

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');

      this.log.debug('Finished initializing platform:', this.config.name);

      // Do not start plugin if errors has been found in config file
      if(this.CheckConfigFile()){

        if(this.Zone1Active){
          if(!this.Controller.AddControllingZone(1, this.Zone1Name, true)){
            this.log.error('Error adding zone 1 to controller');
          }
        }

        if(this.Zone2Active){
          if(!this.Controller.AddControllingZone(2, this.Zone2Name, false)){
            this.log.error('Error adding zone 2 to controller');
          }
        }

        // Start operation when controller is ready
        this.Controller.on('ControllerReadyForOperation', () => {
          this.DumpControllerInfo();
          this.discoverDevices();
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

  discoverDevices() {

    if(this.Zone1Active){
      const AnthemReceiver = new AnthemReceiverPowerInputAccessory(this, this.Controller, this.Controller.GetZoneIndex(1));
      this.log.debug('Controlling zone: ' + this.Controller.GetZoneNumber(AnthemReceiver.GetZoneIndex()));
    }

    if(this.Zone2Active){
      const AnthemReceiver2 = new AnthemReceiverPowerInputAccessory(this, this.Controller, this.Controller.GetZoneIndex(2));
      this.log.debug('Controlling zone: ' + this.Controller.GetZoneNumber(AnthemReceiver2.GetZoneIndex()));

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
    } else{
      this.log.info('Error reading Port from config file, using default value: ' + this.Port);
    }

    if(this.config.Zone1.Active !== undefined){
      this.Zone1Active = this.config.Zone1.Active;
    }

    if(this.config.Zone2.Active !== undefined){
      this.Zone2Active = this.config.Zone2.Active;
    }

    // Do not start plugin if no zone has been set to start in config file
    if(this.Zone1Active === false && this.Zone2Active === false){
      this.log.error('No zone configured in config file ... ');
      return false;
    }

    if(this.config.Zone1.Name !== undefined){
      this.Zone1Name = this.config.Zone1.Name;
    }

    if(this.config.Zone2.Name !== undefined){
      this.Zone2Name = this.config.Zone2.Name;
    }

    return true;
  }

  private DumpControllerInfo(){
    this.log.debug('Controller is configured');
    this.log.debug('Model: ' + this.Controller.ReceiverModel);
    this.log.debug('Serial Number: ' + this.Controller.SerialNumber);
    this.log.debug('Software Version: ' + this.Controller.SoftwareVersion);

    this.log.debug('Controlling ' + this.Controller.GetConfiguredZoneNumber() +' Zones');
    for(let i = 0 ; i < this.Controller.GetConfiguredZoneNumber() ; i++ ){
      this.log.debug(' ' + (i+1) + ': ' + this.Controller.GetZoneName(i));
    }
    this.log.debug('Number of inputs: ' + this.Controller.GetNumberOfInput());

    for(let i = 0 ; i < this.Controller.GetNumberOfInput() ; i++){
      this.log.debug(' ' + (i+1) + ': ' + this.Controller.GetInputName(i));
    }
  }

  ConfigureControllerError(){

    this.Controller.on('ControllerError', (Error, ErrorString) => {

      if(Error === AnthemControllerError.COMMAND_NOT_SUPPORTED){
        this.DumpControllerInfo();
        this.log.error(Error + ': ' + ErrorString);
        return;
      }

      if(Error === AnthemControllerError.INVALID_MODEL_STRING_RECEIVED){
        this.DumpControllerInfo();
        this.log.error(Error + ': ' + ErrorString + ',  Assuming model MRX 740 for debug purpose');
        return;
      }

      // Try to reconnect if network error
      if(Error === AnthemControllerError.CONNECTION_ERROR){
        this.log.debug(Error + ': ' + ErrorString);
        setTimeout(() => {
          this.log.debug('Trying to reconnect ....');
          this.Controller.Connect(this.config.Host, this.config.Port);
        }, this.ReconnectTimeout);

      }
    });
  }
}