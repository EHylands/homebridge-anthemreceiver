import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { AnthemReceiverPowerInputAccessory } from './AnthemReceiverPowerInputAccessory';
import { AnthemController, AnthemControllerError } from './AnthemController';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
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

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    if(this.config.Host === undefined){
      this.log.error('Error reading Host from config.json');
    }

    if(this.config.Port !== undefined){
      this.Port = this.config.Port;
    } else{
      this.log.error('Error reading Port from config.json');
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

    this.Controller = new AnthemController(this.config.Host, this.config.Port);

    if(this.Zone1Active){
      if(!this.Controller.AddControllingZone(1, this.Zone1Name)){
        this.log.error('Error adding zone 1 to controller');
      }
    }

    if(this.Zone2Active){
      if(!this.Controller.AddControllingZone(2, this.Zone2Name)){
        this.log.error('Error adding zone 2 to controller');
      }
    }

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');

      this.log.debug('Finished initializing platform:', this.config.name);
      this.Controller.Connect();

      // Manage controller error
      this.Controller.on('ControllerError', (Error, ErrorString) => {

        this.DumpInfo();

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
          setTimeout(() => {
            this.log.debug('Trying to reconnect ....');
            this.Controller.Connect();
          }, 10000);

        }
        this.log.debug(Error + ': ' + ErrorString);
      });

      // Start operation when controller is ready
      this.Controller.on('ControllerReadyForOperation', () => {
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

        this.discoverDevices();
      });
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
  //this.log.info('Loading accessory from cache:', accessory.displayName);
  //this.accessories.push(accessory);
  }

  discoverDevices() {

    if(this.Zone1Active){
      const AnthemReceiver = new AnthemReceiverPowerInputAccessory(this, this.Controller, this.Controller.GetZoneIndex(1));
    }

    if(this.Zone2Active){
      const AnthemReceiver2 = new AnthemReceiverPowerInputAccessory(this, this.Controller, this.Controller.GetZoneIndex(2));
    }
  }

  private DumpInfo(){
    this.log.debug('Controller is configured');
    this.log.error('Model: ' + this.Controller.ReceiverModel);
    this.log.error('Serial Number: ' + this.Controller.SerialNumber);
    this.log.error('Software Version: ' + this.Controller.SoftwareVersion);

    this.log.error('Controlling ' + this.Controller.GetConfiguredZoneNumber() +' Zones');
    for(let i = 0 ; i < this.Controller.GetConfiguredZoneNumber() ; i++ ){
      this.log.error(' ' + (i+1) + ': ' + this.Controller.GetZoneName(i));
    }
    this.log.error('Number of inputs: ' + this.Controller.GetNumberOfInput());

    for(let i = 0 ; i < this.Controller.GetNumberOfInput() ; i++){
      this.log.error(' ' + (i+1) + ': ' + this.Controller.GetInputName(i));
    }
  }
}