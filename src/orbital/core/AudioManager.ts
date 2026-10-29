// No context, request or sound is created until a future explicit user gesture.
export class AudioManager {
  private context?: AudioContext;
  private gain?: GainNode;
  private source?: AudioBufferSourceNode;
  async enable(url:string) {
    this.context ||= new AudioContext();
    await this.context.resume();
    const response = await fetch(url);
    if(!response.ok) throw new Error('Audio resource unavailable');
    const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
    this.source?.stop();
    this.gain ||= this.context.createGain();
    this.gain.gain.value = .12;
    this.gain.connect(this.context.destination);
    this.source = this.context.createBufferSource();
    this.source.buffer = buffer;this.source.loop = true;this.source.connect(this.gain);this.source.start();
  }
  async suspend() { await this.context?.suspend(); }
  dispose() { this.source?.stop(); void this.context?.close(); }
}
