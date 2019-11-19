import EventEmitter from 'eventemitter3';
import PropM from './propm';
import Gear from './gear';
import Gears from './gears';

interface BeltOption {
  duration: number;
  loop: boolean;
  reverse: boolean;
  round: boolean;
}

interface BeltListener {
  [eventName: string]: (...args: any[]) => void;
}

const root = (typeof window === 'undefined' ? global : window) as Window;

function blender(reverse: boolean) {
  return (progress: number, turn: boolean) => {
    // prettier-ignore
    return turn ?
      reverse ? progress : 1 - progress :
      reverse ? 1 - progress : progress;
  };
}

const defaultOption = {
  duration: 0,
  loop: false,
  reverse: false,
  round: false,
};

class Belt {
  private emitter = new EventEmitter();
  private props: PropM<BeltOption>;
  private gears: Gears;
  // state variable(s).
  private paused: boolean = true;
  // switch variable(s).
  private turn: boolean = false;
  // raf's variable(s).
  private timestamp: number = 0;
  private startTime: number = 0;
  private pastTime: number = 0;
  private rafId: number = 0;
  // blending function.
  private blend: (n: number, t: boolean) => number;

  constructor(option: Partial<BeltOption> = {}, gears: Gear[] = []) {
    this.props = new PropM<BeltOption>(option, defaultOption);
    this.props.listen(this.onUpdateOption, this);
    this.gears = new Gears(gears);
    this.blend = blender(this.props.get('reverse'));
  }

  public isPaused() {
    return this.paused;
  }

  public option(): BeltOption;
  public option(key: Partial<BeltOption>): void;
  public option<T extends keyof BeltOption>(key: T): BeltOption[T];
  public option<T extends keyof BeltOption>(key: T, value: BeltOption[T]): void;
  public option(key?: keyof BeltOption | Partial<BeltOption>, value?: BeltOption[keyof BeltOption]): any {
    if (key === undefined && value === undefined) {
      return this.props.all();
    }
    if (typeof key === 'string' && value === undefined) {
      return this.props.get(key);
    }
    if (typeof key === 'string' && value !== undefined) {
      this.props.set(key, value);
    }
    if (typeof key === 'object' && key.constructor === Object) {
      this.props.merge(key);
    }
  }

  public start() {
    if (this.props.get('duration') === 0 || !this.paused) {
      return;
    }
    this.startTime = 0;
    const stepping = (timestamp: number) => {
      if (!this.startTime) {
        this.startTime = timestamp - this.pastTime;
      }
      this.timestamp = timestamp;
      this.pastTime = timestamp - this.startTime;
      const { duration, loop, round } = this.props.all();
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
      this.rafId = root.requestAnimationFrame(stepping);
    };
    this.rafId = root.requestAnimationFrame(stepping);
    this.paused = false;
    this.emitter.emit('start');
  }

  public pause() {
    if (this.paused) {
      return;
    }
    window.cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.paused = true;
    this.emitter.emit('pause');
  }

  public stop() {
    if (this.paused && this.pastTime === 0) {
      return;
    }
    window.cancelAnimationFrame(this.rafId);
    this.pastTime = 0;
    this.rafId = 0;
    this.paused = true;
    this.turn = false;
    this.emitter.emit('stop');
  }

  public on(eventName: string | BeltListener, listener: (...args: any[]) => void, context?: any) {
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

  public off(eventName: string | BeltListener, listener: (...args: any[]) => void, context?: any) {
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

  private onUpdateOption(changedOption: Partial<BeltOption>, prevOption: BeltOption, nextOption: BeltOption) {
    if (changedOption.hasOwnProperty('duration')) {
      this.pastTime = nextOption.duration * (this.pastTime / prevOption.duration);
      this.startTime = this.timestamp - this.pastTime;
    }
    if (changedOption.hasOwnProperty('reverse')) {
      this.pastTime = this.pastTime > 0 ? nextOption.duration * (1 - this.pastTime / nextOption.duration) : 0;
      this.startTime = this.timestamp - this.pastTime;
      this.blend = blender(nextOption.reverse);
    }
  }
}

export default Belt;
export { BeltOption, BeltListener };
