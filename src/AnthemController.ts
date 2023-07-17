import { TypedEmitter } from 'tiny-typed-emitter';
import net = require('net');

export interface AnthemControllerEvent {
    'ControllerReadyForOperation': () => void;
    'PanelBrightnessChange': (Brightness: number) => void;
    'ZonePowerChange': (Zone: number, Power: boolean) => void;
    'ZoneMutedChange': (Zone: number, Muted:boolean)=> void;
    'ZoneALMChange':(Zone:number, ALM:number)=> void;
    'ZoneDolbyPostProcessingChange':(Zone:number, DolbyAudioMode:AnthemDolbyAudioPostProcessing)=> void;
    'ZoneVolumePercentageChange': (Zone: number, VolumePercentage:number)=> void;
    'ZoneARCEnabledChange':(Zone: number, ARCEnabled:boolean)=>void;
    'ZoneInputChange': (Zone: number, Input: number) => void;
    'InputChange':(InputArray: string[]) => void;
    'ControllerError': (Error: AnthemControllerError, ErrorString: string) => void;
    'ShowDebugInfo':(DebugString: string)=> void;
  }

export enum AnthemReceiverModel {
  Undefined = '',
  MRX310 = 'MRX 310',
  MRX510 = 'MRX 510',
  MRX710 = 'MRX 710',
  MRX520 = 'MRX 520',
  MRX720 = 'MRX 720',
  MRX1120 = 'MRX 1120',
  MRX540 = 'MRX 540',
  MRX740 = 'MRX 740',
  MRX1140 = 'MRX 1140',
  AVM60 = 'AVM 60',
  AVM70 = 'AVM 70',
  AVM90 = 'AVM 90'
}

export enum AnthemAudioListenningMode {
  NONE = 0,
  ANTHEMLOGIC_CINEMA = 1,
  ANTHEMLOGIC_MUSIC = 2,
  DOLBYSUROUND = 3,
  DTSNEURALX = 4,
  DTSVIRTUALX = 5,
  ALLCHANNELSTEREO = 6,
  MONO = 7,
  ALLCHANNELMONO = 8
}

export enum AnthemDolbyAudioPostProcessing {
  OFF = 0,
  MOVIE = 1,
  MUSIC = 2,
  NIGHT = 3,
}



const AllAnthemReceiverModel = [
  AnthemReceiverModel.MRX310,
  AnthemReceiverModel.MRX510,
  AnthemReceiverModel.MRX710,
  AnthemReceiverModel.MRX520,
  AnthemReceiverModel.MRX720,
  AnthemReceiverModel.MRX1120,
  AnthemReceiverModel.MRX540,
  AnthemReceiverModel.MRX740,
  AnthemReceiverModel.MRX1140,
  AnthemReceiverModel.AVM60,
  AnthemReceiverModel.AVM70,
  AnthemReceiverModel.AVM90,
];

const ProtocolV01Model = [
  AnthemReceiverModel.MRX310,
  AnthemReceiverModel.MRX510,
  AnthemReceiverModel.MRX710,
  AnthemReceiverModel.MRX520,
  AnthemReceiverModel.MRX720,
  AnthemReceiverModel.MRX1120,
  AnthemReceiverModel.AVM60,
];

const ProtocolV02Model = [
  AnthemReceiverModel.MRX540,
  AnthemReceiverModel.MRX740,
  AnthemReceiverModel.MRX1140,
  AnthemReceiverModel.AVM70,
  AnthemReceiverModel.AVM90,
];

enum ControllerState {
    Idle,
    Configure,
    Operation,
}

const ALMV01 = [
  'AnthemLogic Movie',
  'AnthemLogic Music',
  'PLIIx Movie',
  'PLIIx Music',
  'Neo:6 Cinema',
  'Neo:6 Music',
  'All Channel Stereo',
  'All Channel Mono',
  'Mono',
  'Mono Academy',
  'Mono(L)',
  'Mono(R)',
  'High Blend',
  'Dolby Surround',
  'Neo:X-Cinema',
  'Neo:X-Music',
];

const ALMV02 = [
  'ANTHEM LOGIC CINEMA',
  'ANTHEM LOGIC MUSIC',
  'DOLBY SURROUND',
  'DTS NEURAL X',
  'DTS VIRTUAL X',
  'ALL CHANNEL STEREO',
  'MONO',
  'ALL CHANNEL MONO',
];

export enum AnthemControllerError {
    CONNECTION_ERROR = 'Controller Connection Error',
    ZONE_IS_NOT_POWERED = 'Zone is not powered',
    COMMAND_NOT_SUPPORTED = 'Command is not supported by receiver',
    RECEIVER_NOT_READY = 'Receiver not ready for operation',
    INVALID_MODEL_STRING_RECEIVED = 'Received and invalid model string from receiver',
    CANNOT_EXECUTE_COMMAND = 'Received a valid command that cannot be executed',
    OUT_OF_RANGE_PARAMETER = 'Controller received an out of range paramenter',
    INVALID_COMMAND = 'Invalid command reveived',
    COMMAND_ONLY_AVAILABLE_ON_MAIN_ZONE = 'Command only available on main zone'
  }

export enum AnthemKeyCode {
    UP = '0018',
    DOWN = '0019',
    LEFT = '0020',
    RIGHT = '0021',
    SELECT = '0022'
  }

export class AnthemZone{
  ZoneNumber = 0;
  private IsMainZone = false;
  private IsMuted = false;
  private ARCConfigured = true;
  private ActiveInput = 0;
  private ActiveInputARCEnabled = false;
  private ActiveInputDolbyPostProcessing = 0;
  private IsPowered = false;
  private PowerConfigured = false;
  private VolumePercentage = 0;
  private Volume = 0;
  private AudioListenningMode = AnthemAudioListenningMode.NONE;
  ZoneName = '';

  constructor(ZoneNumber: number, ZoneName: string, IsMainZone: boolean) {
    this.ZoneNumber = ZoneNumber;
    this.ZoneName = ZoneName;
    this.IsMainZone = IsMainZone;
  }

  GetIsMuted():boolean{
    return this.IsMuted;
  }

  SetIsMuted(Muted:boolean){
    this.IsMuted = Muted;
  }

  GetIsPowered():boolean{
    return this.IsPowered;
  }

  SetIsPowered(Powered: boolean){
    this.IsPowered = Powered;
    this.PowerConfigured = true;
  }

  GetIsMainZone():boolean{
    return this.IsMainZone;
  }

  GetActiveInput():number{
    return this.ActiveInput;
  }

  SetActiveInput(ActiveInput: number){
    this.ActiveInput = ActiveInput;
  }

  GetARCConfigured():boolean{
    return this.ARCConfigured;
  }

  SetARCConfigured(ARCConfigured:boolean){
    this.ARCConfigured = ARCConfigured;
  }

  GetActiveInputARCEnabled():boolean{
    return this.ActiveInputARCEnabled;
  }

  SetActiveInputARCEnabled(ARCEnabled:boolean){
    this.ActiveInputARCEnabled = ARCEnabled;
  }

  GetVolumePercentage():number{
    return this.VolumePercentage;
  }

  GetVolume():number{
    return this.Volume;
  }

  SetVolumePercentage(VolumePercentage:number){
    this.VolumePercentage = VolumePercentage;
  }

  SetVolume(Volume:number){
    this.Volume = Volume;
  }

  IsZoneConfigured():boolean{
    return this.PowerConfigured;
  }

  SetALM(AudioListenningMode:number){
    this.AudioListenningMode = AudioListenningMode;
  }

  GetALM():number{
    return this.AudioListenningMode;
  }
}

export class AnthemController extends TypedEmitter<AnthemControllerEvent> {

    private Host = '';
    private Port = 14999;
    private Client = new net.Socket();
    private CurrentState = ControllerState.Idle;
    private CommandArray: string[] = [];
    private InputNameArray:string[] = [];
    private InputNameArrayOld:string[] = []; // Used to check for any changes when inputs name are refreshed
    private Zones:Record<number, AnthemZone> = {};
    private ConfigMenuDisplayVisible = false;
    PanelBrightness = 0;
    private SocketTimeout = 300000; // 5 minutes

    SerialNumber = '';
    SoftwareVersion = '';
    ReceiverModel = AnthemReceiverModel.Undefined;

    constructor() {
      super();
    }

    Connect(Host: string, Port:number){

      this.Client = new net.Socket();
      this.Client.setTimeout(this.SocketTimeout);

      this.Host = Host;
      this.Port = Port;

      this.Client.on('data', (data) => {
        this.AnalyseResponse(data);
      });

      this.Client.on('error', (err) =>{
        this.CurrentState = ControllerState.Idle;
        this.emit('ControllerError', AnthemControllerError.CONNECTION_ERROR, err.message);
        this.Client.destroy();

      });

      this.Client.on('timeout', ()=>{
        this.CurrentState = ControllerState.Idle;
        this.emit('ControllerError', AnthemControllerError.CONNECTION_ERROR, 'Timeout');
        this.Client.destroy();
      });

      this.Client.connect(this.Port, this.Host, () => {
        // This controller supports 2 protocols:
        // - Protocol V02 used for X40 Model Serie
        // - Protocol V01 used for X10 and X20 Model Serie
        // - Need Model Number to send proper commands to receiver
        this.GetModel();
      });
    }

    AddControllingZone(NewZone: number, ZoneName: string, IsMainZone: boolean):boolean {
      // We can only add a new zone while the controller is Idle
      if(this.CurrentState !== ControllerState.Idle){
        return false;
      }

      // Check if zone is 1 or 2;
      if(NewZone !== 1 && NewZone !== 2){
        return false;
      }

      // Cannot add a duplicate zone.
      if(this.Zones[NewZone] !== undefined){
        return false;
      }

      this.Zones[NewZone] = new AnthemZone(NewZone, ZoneName, IsMainZone);
      return true;
    }

    GetZones(){
      return this.Zones;
    }

    GetZone(ZoneNumber:number){
      return this.Zones[ZoneNumber];
    }

    GetIsMenuDisplayVisible(){
      return this.ConfigMenuDisplayVisible;
    }

    GetZoneName(ZoneNumber: number){
      return this.Zones[ZoneNumber].ZoneName;
    }

    GetConfiguredZoneNumber(){
      return Object.keys(this.Zones).length;
    }

    GetNumberOfInput(){
      return this.InputNameArray.length;
    }

    GetInputs(){
      return this.InputNameArray;
    }

    SwitchInput(ZoneNumber: number){
      let Input = this.Zones[ZoneNumber].GetActiveInput();
      Input++;
      if(Input > this.InputNameArray.length){
        Input = 1;
      }
      this.SetZoneInput(ZoneNumber, Input);
    }

    GetALMArray():string[]{
      if(this.IsProtocolV01()){
        return ALMV01;
      }

      if(this.IsProtocolV02()){
        return ALMV02;
      }

      return [];
    }

    //
    // Function GetInputHasChange()
    // To be called after receiver updates inputs name
    // Check if any input has changed with update
    //
    private GetInputHasChange():boolean{
      if(this.InputNameArray.length !== this.InputNameArrayOld.length){
        return true;
      }

      for(let i = 0 ; i < this.InputNameArray.length ; i++){
        if(this.InputNameArray[i] !== this.InputNameArrayOld[i]){
          return true;
        }
      }
      return false;
    }

    //
    // Function Queue Command()
    // Insert a new command in the queue. Dont sent immediatly
    //
    private QueueCommand(Command:string){
      this.CommandArray.push(Command);
    }

    //
    // Function SendCommand()
    // Clear the Command Buffer and send to receiver
    //
    private SendCommand(){
      let CommandString = '';
      for(let i = 0 ; i < this.CommandArray.length ; i ++){
        CommandString = CommandString + this.CommandArray[i] + ';';
      }

      // Show extended debug information in homebridge log
      this.emit('ShowDebugInfo', 'Sending: ' + CommandString);

      this.Client.write(CommandString);
      this.CommandArray = [];
    }

    //
    // Function IsProtocolV01()
    // Check if current model support protocol V01
    // Anthem MRX 710-510-310 AVR
    // Anthem MRX 1120-720-520 AVR and AVM 60
    //
    IsProtocolV01():boolean{
      if(ProtocolV01Model.indexOf(this.ReceiverModel) !== -1){
        return true;
      }
      return false;
    }

    //
    // Function IsProtocolV02()
    // Check if current model support protocol V02
    // Anthem MRX 1140-740-540 AVR and AVM 90-70 AVP
    //
    IsProtocolV02():boolean{
      if(ProtocolV02Model.indexOf(this.ReceiverModel) !== -1){
        return true;
      }
      return false;
    }

    //
    // Function GetModelFromReceiver()
    // Get model number from receiver
    //
    // Availability: All models supported by controller
    private GetModelFromReceiver(){
      this.QueueCommand('IDM?');
    }

    //
    // Function SendKeepAlivePacket()
    // Keep connection open (Receiver will process GetModel command even when powered off)
    //
    // Availability: All models supported by controller
    private SendKeepAlivePacket(){
      setTimeout(() => {
        this.GetModelFromReceiver();
        this.SendCommand();
      }, this.SocketTimeout/2);
    }

    //
    // Function GetSerialNumberFromReceiver()
    // Get serial number from receiver
    //
    // Availability:
    // Anthem MRX 1140-740-540 AVR and AVM 90-70 AVP
    //
    private GetSerialNumberFromReceiver(){

      if(!this.IsProtocolV02()){
        this.CurrentState = ControllerState.Idle;
        this.emit('ControllerError', AnthemControllerError.COMMAND_NOT_SUPPORTED, 'GetSerial (GSN?)');
        return;
      }
      this.QueueCommand('GSN?');
    }

    private GetPanelBrightness(){
      if(this.IsProtocolV01()){
        return;
      }

      if(this.IsProtocolV02()){
        this.QueueCommand('GCFPB?');
      }
    }

    SetPanelBrightness(Brightness:number){
      this.QueueCommand('GCFPB' + Brightness);
      this.SendCommand();
    }

    //
    // Function GetMACAddress()
    // Get MAC Address from receiver. To be used as unique id
    //
    // Availability:
    // Anthem MRX 710-510-310 AVR
    // Anthem MRX 1120-720-520 AVR and AVM 60
    //
    GetMACAddress(){
      if(!this.IsProtocolV01()){
        this.CurrentState = ControllerState.Idle;
        this.emit('ControllerError', AnthemControllerError.COMMAND_NOT_SUPPORTED, 'GetMACAddress (IDN?)');
        return;
      }
      this.QueueCommand('IDN?');
    }

    //
    // Function GetsoftwareVersionFromReceiver()
    // Get software version from receiver
    //
    // Availability: All models supported by controller
    private GetsoftwareVersionFromReceiver(){
      this.QueueCommand('IDS?');
    }

    //
    // Function GetIsZonePoweredFromReceiver()
    // Get zone power status from receiver
    //
    // Availability: All models supported by controller
    private GetIsZonePoweredFromReceiver(ZoneNumber: number){
      this.QueueCommand('Z' + ZoneNumber + 'POW?');
    }

    //
    // Function GetIsZoneMutedromReceiver()
    // Get zone muted status from receiver
    //
    // Availability: All models supported by controller
    private GetIsZoneMutedFromReceiver(ZoneNumber: number){
      this.QueueCommand('Z' + ZoneNumber + 'MUT?');
    }

    private GetZoneVolumeFromReceiver(ZoneNumber:number){
      this.QueueCommand('Z' + ZoneNumber + 'VOL?');
    }

    private GetZoneVolumePercentageFromReceiver(ZoneNumber:number){
      this.QueueCommand('Z' + ZoneNumber + 'PVOL?');
    }

    SetZoneVolumePercentage(ZoneNumber:number, VolumePercentage: number){
      this.QueueCommand('Z' + ZoneNumber + 'PVOL' + VolumePercentage);
      this.SendCommand();
    }

    //
    // Function  GetNumberOfInputFromReceiver()
    // Get nimber of input from receiver
    //
    // Availability: All models supported by controller
    private GetNumberOfInputFromReceiver(){
      this.QueueCommand('ICN?');
    }

    //
    // Function GetInputsNameFromReceiver()
    // Get input name from receiver
    //
    // Availability: All model
    //
    private GetInputsNameFromReceiver(){

      if(this.IsProtocolV01()){
        for(let i = 1 ; i <= this.InputNameArray.length ; i++){
          if(i < 10){
            this.QueueCommand('ISN0' + i + '?');
          } else{
            this.QueueCommand('ISN' + i + '?');
          }
        }
      }

      if(this.IsProtocolV02()){
        for(let i = 1 ; i <= this.InputNameArray.length ; i++){
          this.QueueCommand('IS' + i +'IN?');
        }
      }

      this.SendCommand();
    }

    //
    // Function GetZoneActiveInputFromReceiver()
    // Get zone active input
    //
    // Availability: All model
    private GetZoneActiveInputFromReceiver(ZoneNumber:number){
      this.QueueCommand('Z' + ZoneNumber + 'INP?');
    }

    //
    // Function SetZoneInput()
    // Set Zone active input
    //
    // Availability: All model
    SetZoneInput(ZoneNumber: number, InputNumber: number){
      this.QueueCommand('Z' + ZoneNumber + 'INP' + InputNumber);
      this.SendCommand();
    }

    //
    // Function GetARCConfigured()
    //
    // Availability: x40 models
    private GetARCConfigured(){

      if(!this.IsProtocolV02()){
        this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND,
          'GetARCConfigured command only supported on x40 models');
        return;
      }

      this.QueueCommand('Z1ARCVAL?');
      this.SendCommand();
    }

    //
    // Function GetZoneARCEnabled()
    //
    // Availability: All model
    GetZoneARCEnabled(ZoneNumber:number){

      if(!this.Zones[ZoneNumber].GetIsMainZone()){
        this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND,
          'ARC Command only available on main zone');
        return;
      }

      if(this.IsProtocolV01()){
        this.QueueCommand('Z' + ZoneNumber + 'ARC?');
      }

      if(this.IsProtocolV02()){
        this.QueueCommand('IS' + this.Zones[ZoneNumber].GetActiveInput() +'ARC?');
      }

      this.SendCommand();
    }

    //
    // Function SetZoneARCEnabled()
    //
    // Availability: All model
    SetZoneARCEnabled(ZoneNumber:number, ARCEnabled:boolean){

      if(!this.Zones[ZoneNumber].GetIsMainZone()){
        this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND,
          'ARC Command only available on main zone');
        return;
      }

      if(this.IsProtocolV02() && !this.Zones[ZoneNumber].GetARCConfigured()){
        this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND,
          'ARC is not configured on main zone');
        return;
      }

      let CommandString = '0';
      if(ARCEnabled){
        CommandString = '1';
      }

      if(this.IsProtocolV01()){
        this.QueueCommand('Z' + ZoneNumber + 'ARC' + CommandString);
      }

      if(this.IsProtocolV02()){
        this.QueueCommand('IS' + this.Zones[ZoneNumber].GetActiveInput() +'ARC' + CommandString);
      }

      this.SendCommand();
    }

    //
    // Function GetDolbyPostProcessing()
    //
    // Availability: x40 models
    GetDolbyPostProcessing(ZoneNumber:number){
      if(this.IsProtocolV02()){
        this.QueueCommand('IS' + this.Zones[ZoneNumber].GetActiveInput() +'DV?');
        this.SendCommand();
      }
    }

    //
    // Function SetDolbyPostProcessing()
    //
    // Availability: x40 models
    SetDolbyPostProcessing(ZoneNumber:number, DolbyAudioMode:number){
      if(this.IsProtocolV02()){
        this.QueueCommand('IS' + this.Zones[ZoneNumber].GetActiveInput() +'DV' + DolbyAudioMode);
        this.SendCommand();
      }
    }

    //
    // Function SetAudioListeningMode()
    //
    // Availability: All model
    SetAudioListeningMode(ZoneNumber:number, AudioMode: number){
      if(!this.Zones[ZoneNumber].GetIsMainZone()){
        this.emit('ControllerError', AnthemControllerError.COMMAND_ONLY_AVAILABLE_ON_MAIN_ZONE, '');
        return;
      }

      if(this.IsProtocolV02()){
        this.QueueCommand('Z' + ZoneNumber + 'ALM' + AudioMode);
      } else{
        //
      }
      this.SendCommand();
    }

    //
    // Function ToggleAudioListeningMode()
    // Iterate throught inputs
    //
    // Availability: All model
    ToggleAudioListeningMode(ZoneNumber:number, UP: boolean){
      if(!this.Zones[ZoneNumber].GetIsMainZone()){
        this.emit('ControllerError', AnthemControllerError.COMMAND_ONLY_AVAILABLE_ON_MAIN_ZONE, '');
        return;
      }

      if(this.IsProtocolV02()){
        if(UP){
          this.QueueCommand('Z1AUP');
        } else{
          this.QueueCommand('Z1ADN');
        }
      } else{
        if(UP){
          this.QueueCommand('Z1ALMna');

        } else{
          this.QueueCommand('Z1ALMpa');
        }

      }
      this.SendCommand();
    }

    //
    // Function GetAudioListeningMode()
    // Iterate throught inputs
    //
    // Availability: All model
    GetAudioListeningMode(ZoneNumber:number){
      if(!this.Zones[ZoneNumber].GetIsMainZone()){
        this.emit('ControllerError', AnthemControllerError.COMMAND_ONLY_AVAILABLE_ON_MAIN_ZONE, '');
        return;
      }

      this.QueueCommand('Z1ALM?');
    }

    // All zone need to have IsMuted, IsPowered and ActiveInput set before starting
    // Controller operation;
    IsAllZoneConfigured(){

      if(this.IsProtocolV01()){

        for(const ZoneNumber in this.Zones){
          const Zone = this.Zones[ZoneNumber];
          if(!Zone.IsZoneConfigured()){
            return false;
          }
        }
        return this.IsAllInputConfigured();
      }

      if(this.IsProtocolV02()){

        for(const ZoneNumber in this.Zones){
          const Zone = this.Zones[ZoneNumber];
          if(!Zone.IsZoneConfigured()){
            return false;
          }
        }

        return this.IsAllInputConfigured();
      }
    }

    //
    // Function IsAllInputConfigured()
    // Check if name has been set or all inputs
    //
    IsAllInputConfigured(){
      if(this.InputNameArray.length === 0){
        return false;
      }

      for( let i = 0 ; i < this.InputNameArray.length; i ++){
        if(this.InputNameArray[i] === undefined){
          return false;
        }
      }
      return true;
    }

    //
    // Function PowerZone()
    // Set power to zone
    //
    PowerZone(ZoneNumber: number, Power:boolean){
      if(Power === true){
        this.QueueCommand('Z' + ZoneNumber + 'POW1');
      } else{
        this.QueueCommand('Z' + ZoneNumber + 'POW0');
      }
      this.SendCommand();
    }

    //
    // Function ToggleMute()
    //
    // Availability: All model
    ToggleMute(ZoneNumber: number){
      this.QueueCommand('Z' + ZoneNumber + 'MUTt');
      this.SendCommand();
    }

    //
    // Function SetMute()
    //
    // Availability: All model
    SetMute(ZoneNumber: number, Mute: boolean){

      let m = '0';
      if(Mute === true){
        m = '1';
      }
      this.QueueCommand('Z' + ZoneNumber + 'MUT' + m);
      this.SendCommand();
    }

    //
    // Function GetMute()
    //
    // Availability: All model
    GetMute(ZoneNumber: number):boolean{
      return this.Zones[ZoneNumber].GetIsMuted();
    }

    //
    // Function VolumeUp()
    //
    // Availability: All model
    VolumeUp(ZoneNumber: number){

      if(this.IsProtocolV02()){
        this.QueueCommand('Z'+ ZoneNumber + 'VUP');
        this.SendCommand();
        return;
      }

      if(this.IsProtocolV01()){
        this.QueueCommand('Z'+ ZoneNumber + 'VUP1');
        this.SendCommand();
        return;
      }
    }

    //
    // Function Volume Down()
    //
    // Availability: All model
    VolumeDown(ZoneNumber: number){

      if(this.IsProtocolV02()){
        this.QueueCommand('Z'+ ZoneNumber + 'VDN');
      } else{
        this.QueueCommand('Z'+ ZoneNumber + 'VDN1');
      }
      this.SendCommand();
    }

    //
    // Function ToggleConfigMenu()
    // Show on screen configuration menu
    //
    // Availability: All model
    ToggleConfigMenu(){
      this.QueueCommand('Z1SMDt');
      this.SendCommand();
    }

    //
    // Function ToggleConfigMenu()
    // Show on screen configuration menu
    //
    // Availability: All model
    GetConfigMenuState(){
      this.QueueCommand('Z1SMD?');
    }

    //
    // Function SendKey()
    //
    // Availability: All model
    SendKey(ZoneNumber: number, Code: AnthemKeyCode){
      this.QueueCommand('Z'+ ZoneNumber + 'SIM'+ Code);
      this.SendCommand();
    }

    //
    // Function GetZonePower()
    // Get Zone power status
    //
    GetZonePower(ZoneNumber: number){
      return this.Zones[ZoneNumber].GetIsPowered();
    }

    //
    // Function SetModel
    // Set receiver model from string received from receiver
    //
    private SetModel(ModelString: string){

      // Check for extra white space at the end of ModelString
      let ModifiedModelString = ModelString;
      if(ModifiedModelString.slice(ModifiedModelString.length-1) === ' '){
        ModifiedModelString = ModifiedModelString.slice(0, ModifiedModelString.length-1);
      }

      for(let i = 0 ; i < AllAnthemReceiverModel.length ; i++){
        if(ModifiedModelString === AllAnthemReceiverModel[i]){
          // Found a match
          this.ReceiverModel = AllAnthemReceiverModel[i];
          return;
        }
      }

      // No match.
      // For debug purpose, asssume model MRX 740
      this.emit('ControllerError', AnthemControllerError.INVALID_MODEL_STRING_RECEIVED, ModifiedModelString);
      this.ReceiverModel = AnthemReceiverModel.MRX740;
    }

    //
    // Function GetModel
    // First step for controller configuration
    // Need to get model from receiver to send proper command format afterward.
    private GetModel(){
      this.CurrentState = ControllerState.Configure;
      this.GetModelFromReceiver();
      this.SendCommand();
    }

    //
    // Function UpdateOnZonePower
    //
    //
    private UpdateOnZonePower(ZoneNumber:number){

      this.GetZoneActiveInputFromReceiver(ZoneNumber);
      this.GetIsZoneMutedFromReceiver(ZoneNumber);
      this.GetZoneVolumeFromReceiver(ZoneNumber);

      if(this.IsProtocolV02()){
        this.GetZoneVolumePercentageFromReceiver(ZoneNumber);
      }

      this.GetConfigMenuState();
      this.GetNumberOfInputFromReceiver();
      this.GetPanelBrightness();
      this.GetAudioListeningMode(1);
      this.SendCommand();
    }

    //
    // Function Configure
    // Second step for controller configuration
    // Need to get model from receiver to send proper command format afterward.
    private Configure(){
      this.CurrentState = ControllerState.Configure;

      this.GetsoftwareVersionFromReceiver();

      if(this.IsProtocolV01()){
        this.GetMACAddress();

        // Experimental
        this.GetNumberOfInputFromReceiver();
      }

      // Protocol 2 devices can read inputs number and inputs names even if zone is powered off
      if(this.IsProtocolV02()){
        this.GetSerialNumberFromReceiver();
        this.GetNumberOfInputFromReceiver();
        this.GetARCConfigured();
      }

      for(const ZoneNumber in this.Zones){
        this.GetIsZonePoweredFromReceiver(Number(ZoneNumber));
      }

      this.SendCommand();
    }

    //
    // Function AnalyseResponse
    // Process data received from receiver
    //
    private AnalyseResponse(Data: Buffer){
      const SplitString = Data.toString().split(';');

      for(let i = 0 ; i < SplitString.length - 1 ; i ++){
        let Response = SplitString[i];

        this.emit('ShowDebugInfo', 'Reading: "' + Response + '"');

        // Remove white space if present
        if(Response.slice(Response.length-1) === ' '){
          Response = Response.slice(0, Response.length-1);
        }

        if(Response.length !== 0){

          // Get Device Model
          if(Response.substring(0, 3) === 'IDM'){
            this.SetModel(Response.substring(3, Response.length));
            if(this.CurrentState === ControllerState.Configure){
              this.Configure();
            } else{
              // Continue keep alive process
              this.SendKeepAlivePacket();
            }
          }

          // Get Serial Number
          if(Response.substring(0, 3) === 'GSN'){
            this.SerialNumber = Response.substring(3, Response.length);
          }

          // Get Mac Address
          if(Response.substring(0, 3) === 'IDN'){
            this.SerialNumber = Response.substring(3, Response.length);
          }

          // Get software version
          if(Response.substring(0, 3) === 'IDS'){
            this.SoftwareVersion = Response.substring(3, Response.length);
          }

          // Get Panel Brightness
          if(Response.substring(0, 5) === 'GCFPB' ){
            this.PanelBrightness = Number(Response.substring(5, Response.length));

            if(this.CurrentState === ControllerState.Operation){
              this.emit('PanelBrightnessChange', this.PanelBrightness);
            }
          }

          // Get Dolby Post Processing
          if(Response.substring(0, 2) === 'IS' && Response.substring(3, 5) === 'DV'){
            const Input = Number(Response[2]);
            const DolbyAudioMode = Number(Response[5]);

            for(const ZoneNumber in this.Zones){
              const Zone = this.Zones[ZoneNumber];
              if(Zone.GetActiveInput() === Input){
                this.emit('ZoneDolbyPostProcessingChange', Number(ZoneNumber), DolbyAudioMode);
              }
            }
          }

          // Get number of input
          if(Response.substring(0, 3) === 'ICN'){
            const NumberInput = Number(Response.substring(3, Response.length));
            this.InputNameArrayOld = this.InputNameArray;
            this.InputNameArray = new Array(NumberInput);
            this.GetInputsNameFromReceiver();
          }

          // Get Zone power status
          for(const ZoneNumber in this.Zones){
            const Zone = this.Zones[ZoneNumber];
            if(Response.substring(0, 5) === ('Z' + ZoneNumber + 'POW')){
              Zone.SetIsPowered(Response[5] === '1');

              // Update zone info when power is on
              if(Zone.GetIsPowered()){
                this.UpdateOnZonePower(Number(ZoneNumber));
              }

              if(this.CurrentState === ControllerState.Operation){
                this.emit('ZonePowerChange', Number(ZoneNumber), Zone.GetIsPowered());
              }

              break;
            }
          }

          // Set Zone ALM
          for(const ZoneNumber in this.Zones){
            const Zone = this.Zones[ZoneNumber];
            if(Response.substring(0, 5) === ('Z' + ZoneNumber + 'ALM')){
              Zone.SetALM(Number(Response[5]));
              if(this.CurrentState === ControllerState.Operation){
                this.emit('ZoneALMChange', Number(ZoneNumber), Zone.GetALM());
              }

            }
          }

          // Set Zone Mute
          for(const ZoneNumber in this.Zones){
            const Zone = this.Zones[ZoneNumber];
            if(Response.substring(0, 5) === ('Z' + ZoneNumber + 'MUT')){
              Zone.SetIsMuted(Response[5] === '1');

              if(this.CurrentState === ControllerState.Operation){
                this.emit('ZoneMutedChange', Number(ZoneNumber), Zone.GetIsMuted());
              }
              break;
            }
          }

          // Set VolumePercentage
          for(const ZoneNumber in this.Zones){
            const Zone = this.Zones[ZoneNumber];
            if(Response.substring(0, 6) === ('Z' + ZoneNumber + 'PVOL')){
              Zone.SetVolumePercentage(Number(Response.substring(6, Response.length)));

              if(this.CurrentState === ControllerState.Operation){
                this.emit('ZoneVolumePercentageChange', Number(ZoneNumber), Zone.GetVolumePercentage());
                break;
              }
            }
          }

          // Set Volume
          for(const ZoneNumber in this.Zones){
            const Zone = this.Zones[ZoneNumber];
            if(Response.substring(0, 5) === ('Z' + ZoneNumber + 'VOL')){
              Zone.SetVolume(Number(Response.substring(5, Response.length)));
            }
          }

          // Get Input Name
          if(Response.substring(0, 2) === 'IS'){
            const TempString = Response.substring(2, Response.length);
            // Find position of firs 'IN' in string
            for(let i = 0 ; i < Response.length-2; i++){
              if(TempString.substring(i, i+2) === 'IN'){
                const InputNumber = Number(TempString.substring(0, i));
                const Name = TempString.substring(i+2, TempString.length);

                this.InputNameArray[InputNumber-1] = Name;

                if(this.CurrentState === ControllerState.Operation){
                  if(InputNumber === this.InputNameArray.length){
                    if(this.GetInputHasChange()){
                      this.emit('InputChange', this.InputNameArray);
                    }
                  }
                  break;
                }
              }
            }
          }

          // Get Input Name from older dervice function
          if(Response.substring(0, 3) === 'ISN'){
            const InputNumber = Number(Response.substring(3, 5));
            const Name = Response.substring(5, Response.length);

            this.InputNameArray[InputNumber - 1] = Name;

            if(this.CurrentState === ControllerState.Operation){
              if(InputNumber === this.InputNameArray.length){
                if(this.GetInputHasChange()){
                  this.emit('InputChange', this.InputNameArray);
                }
              }
            }
          }

          // Get new active input
          for(const ZoneNumber in this.Zones){
            const Zone = this.Zones[ZoneNumber];
            if(Response.substring(0, 5) === ('Z' + ZoneNumber + 'INP')){
              Zone.SetActiveInput(Number(Response.substring(5, Response.length)));
              this.GetDolbyPostProcessing(Number(ZoneNumber));

              if(Zone.GetIsMainZone()){
                this.GetZoneARCEnabled(Number(ZoneNumber));
              }

              if(this.CurrentState === ControllerState.Operation){
                this.emit('ZoneInputChange', Number(ZoneNumber), Zone.GetActiveInput());
              }
            }
          }

          // Get Config Menu Sate
          if(Response.substring(0, 5) === 'Z1SMD'){
            this.ConfigMenuDisplayVisible = Response[5] === '1';
          }

          // Get Main Zone ARC Configured
          if(Response.substring(0, 8) === 'Z1ARCVAL'){
            const MainZoneARCConfigured = (Response[8] === '1');
            for(const ZoneNumber in this.Zones){
              const Zone = this.Zones[ZoneNumber];
              if(Zone.GetIsMainZone()){
                Zone.SetARCConfigured(MainZoneARCConfigured);
              }
            }
          }

          // Get Main Zone ARC Enabled ProtocolV02
          for(const ZoneNumber in this.Zones){
            const Zone = this.Zones[ZoneNumber];
            if(Zone.GetIsMainZone() && this.IsProtocolV02()){
              if(Response.substring(0, 6) === ('IS' + Zone.GetActiveInput() + 'ARC')){
                const ARCEnabled = Response[6] === '1';
                Zone.SetActiveInputARCEnabled(ARCEnabled);
                this.emit('ZoneARCEnabledChange', Number(ZoneNumber), ARCEnabled);
                break;
              }
            }
          }

          // Get Zone ARC Enabled ProtocolV01
          for(const ZoneNumber in this.Zones){
            const Zone = this.Zones[ZoneNumber];
            if(Response.substring(0, 5) === ('Z' + ZoneNumber + 'ARC')){
              const ARCEnabled = Response[5] === '1';
              Zone.SetActiveInputARCEnabled(ARCEnabled);
              this.emit('ZoneARCEnabledChange', Number(ZoneNumber), ARCEnabled);
              break;
            }
          }

          // Error management
          if(Response.substring(0, 2) === '!E'){
          // Valid command, but cannot be executed
            this.emit('ControllerError', AnthemControllerError.CANNOT_EXECUTE_COMMAND, ': ' + Response.substring(2, Response.length));
          }

          // Error management
          if(Response.substring(0, 2) === '!R'){
            // Out of range parameter
            this.emit('ControllerError', AnthemControllerError.OUT_OF_RANGE_PARAMETER, ': ' + Response.substring(2, Response.length));
          }

          // Error management
          if(Response.substring(0, 2) === '!I'){
            // Invalid command
            this.emit('ControllerError', AnthemControllerError.INVALID_COMMAND, ': ' + Response.substring(2, Response.length));
          }

          // Error management
          if(Response.substring(0, 2) === '!Z'){
            // Invalid command
            this.emit('ControllerError', AnthemControllerError.ZONE_IS_NOT_POWERED, ': ' + Response.substring(2, Response.length));
          }

          // Check if all information has been received to become ready for operation
          if(this.CurrentState === ControllerState.Configure){
            if(this.ReceiverModel !== AnthemReceiverModel.Undefined
              && this.SoftwareVersion !== ''
              && this.SerialNumber !== ''
              && this.IsAllZoneConfigured()
            ){
              // Panel is configured, now ready for operation
              this.CurrentState = ControllerState.Operation;
              this.emit('ControllerReadyForOperation');

              // Start keep alice process (GetModel)
              this.SendKeepAlivePacket();
            }
          }
        }
      }
    }
}