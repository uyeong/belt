import EventEmitter from 'eventemitter3';
import Optionor, { Option, EasingFn } from './optionor';

interface ListenerMap {
  [eventName: string]: (...args: any[]) => void;
}

const root = (typeof window === 'undefined' ? global : window) as Window;

function blender(easing: EasingFn, reverse: boolean) {
  return (progress: number, turn: boolean) => {
    // prettier-ignore
    return turn ?
      reverse ? easing(progress) : 1 - easing(progress) :
      reverse ? 1 - easing(progress) : easing(progress);
  };
}

class Belt {
  private emitter = new EventEmitter();
  private optionor: Optionor;
  private paused: boolean = true;
  private blend: (n: number, t: boolean) => number;
  private wait: number = 0;
  private turn: boolean = false;
  private timestamp: number = 0;
  private startTime: number = 0;
  private pastTime: number = 0;
  private rafId: number = 0;

  constructor(option: Partial<Option> = {}) {
    this.optionor = new Optionor(option);
    this.optionor.listen(this.onUpdateOption, this);
    const { delay, easing, reverse } = this.optionor.all();
    this.blend = blender(easing, reverse);
    this.wait = delay;
  }

  public isStarted() {
    return this.rafId > 0;
  }

  public isPaused() {
    return this.paused;
  }

  public option(): Option;
  public option(key: Partial<Option>): void;
  public option<T extends keyof Option>(key: T): Option[T];
  public option<T extends keyof Option>(key: T, value: Option[T]): void;
  public option(key?: keyof Option | Partial<Option>, value?: Option[keyof Option]): any {
    if (key === undefined && value === undefined) {
      return this.optionor.all();
    }
    if (typeof key === 'string' && value === undefined) {
      return this.optionor.get(key);
    }
    if (typeof key === 'string' && value !== undefined) {
      this.optionor.set(key, value);
    }
    if (typeof key === 'object' && key.constructor === Object) {
      this.optionor.merge(key);
    }
  }

  public start() {
    if (this.optionor.get('duration') === 0 || this.isStarted()) {
      return;
    }
    this.startTime = 0;
    const stepping = (timestamp: number) => {
      if (!this.startTime) {
        this.startTime = timestamp - this.pastTime;
      }
      this.timestamp = timestamp;
      this.pastTime = timestamp - this.startTime;
      if (this.wait > 0 && this.pastTime > this.wait) {
        this.startTime = 0;
        this.pastTime = 0;
        this.wait = 0;
      }
      if (this.wait <= 0) {
        if (this.paused) {
          this.emitter.emit('start');
        }
        this.paused = false;
        const { duration, loop, round } = this.optionor.all();
        const progress = this.pastTime / duration;
        if (this.pastTime >= duration) {
          this.emitter.emit('update', this.blend(1, this.turn));
          if (loop || (round && !this.turn)) {
            this.startTime = timestamp;
            if (round) {
              this.turn = !this.turn;
            }
          } else {
            this.pastTime = 0;
            this.rafId = 0;
            this.paused = true;
            this.turn = false;
            this.emitter.emit('done');
            return;
          }
        } else {
          this.emitter.emit('update', this.blend(progress, this.turn));
        }
      }
      this.rafId = root.requestAnimationFrame(stepping);
    };
    root.requestAnimationFrame(stepping);
    return this;
  }

  public pause() {
    if (!this.isStarted()) {
      return;
    }
    window.cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.paused = true;
    this.emitter.emit('pause');
  }

  public stop() {
    if (!this.isStarted()) {
      return;
    }
    window.cancelAnimationFrame(this.rafId);
    this.pastTime = 0;
    this.rafId = 0;
    this.paused = true;
    this.emitter.emit('stop');
  }

  public on(eventName: string | ListenerMap, listener: (...args: any[]) => void, context?: any) {
    if (typeof eventName === 'object' && eventName.constructor === Object) {
      for (const key in eventName /* is BeltListener */) {
        if (eventName.hasOwnProperty(key)) {
          this.emitter.on(key, eventName[key]);
        }
      }
    }
    if (typeof eventName === 'string') {
      this.emitter.on(eventName, listener, context);
    }
    return this;
  }

  public off(eventName: string | ListenerMap, listener: (...args: any[]) => void, context?: any) {
    if (typeof eventName === 'object' && eventName.constructor === Object) {
      for (const key in eventName /* is BeltListener */) {
        if (eventName.hasOwnProperty(key)) {
          this.emitter.off(key, eventName[key]);
        }
      }
    }
    if (typeof eventName === 'string') {
      this.emitter.off(eventName, listener, context);
    }
    return this;
  }

  private onUpdateOption(changedOption: Partial<Option>, prevOption: Option, nextOption: Option) {
    if (changedOption.hasOwnProperty('delay') && this.paused) {
      this.wait = nextOption.delay === 0 ? 0.1 : nextOption.delay;
    }
    if (changedOption.hasOwnProperty('duration')) {
      this.pastTime = nextOption.duration * (this.pastTime / prevOption.duration);
      this.startTime = this.timestamp - this.pastTime;
    }
    if (changedOption.hasOwnProperty('reverse')) {
      this.pastTime = nextOption.duration * (1 - this.pastTime / nextOption.duration);
      this.startTime = this.timestamp - this.pastTime;
      this.blend = blender(nextOption.easing, nextOption.reverse);
    }
    if (changedOption.hasOwnProperty('easing')) {
      this.blend = blender(nextOption.easing, nextOption.reverse);
    }
  }
}

export default Belt;
export { Option as BeltOption, ListenerMap as BeltListener, EasingFn as BeltEasingFn };
