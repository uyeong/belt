import EventEmitter3 from 'eventemitter3';

interface BeltOption {
  delay?: number;
  duration?: number;
  loop?: boolean;
  reverse?: boolean;
  round?: boolean;
  easing?: BeltEasingFn;
}

interface BeltListener {
  [eventName: string]: (...args: any[]) => void;
}

type BeltEasingFn = (n: number) => number;

const root = (typeof window === 'undefined' ? global : window) as Window;

function blender(easing: BeltEasingFn, reverse: boolean) {
  return (n: number) => (reverse ? 1 - easing(n) : easing(n));
}

class Belt {
  private emitter: EventEmitter3;
  private delay: number;
  private duration: number;
  private loop: boolean;
  private reverse: boolean;
  private round: boolean;
  private easing: BeltEasingFn;
  private pastTime: number = 0;
  private rafId: number = 0;

  constructor(option: BeltOption = {}) {
    this.emitter = new EventEmitter3();
    this.delay = option.delay || 0;
    this.duration = option.duration || 0;
    this.loop = option.loop || false;
    this.reverse = option.reverse || false;
    this.round = option.round || false;
    this.easing = option.easing || ((n: number) => n);
  }

  public option(): BeltOption;
  public option(key: BeltOption): void;
  public option<T extends keyof BeltOption>(key: T): BeltOption[T];
  public option<T extends keyof BeltOption>(key: T, value: BeltOption[T]): void;
  public option(key?: keyof BeltOption | BeltOption, value?: BeltOption[keyof BeltOption]): any {
    if (key === undefined && value === undefined) {
      return {
        delay: this.delay,
        duration: this.duration,
        loop: this.loop,
        reverse: this.reverse,
        round: this.round,
      };
    }
    if (typeof key === 'string' && value === undefined) {
      return this[key];
    }
    if (typeof key === 'string' && value !== undefined) {
      // @ts-ignore
      this[key] = value;
    }
    if (typeof key === 'object' && key.constructor === Object) {
      const option = key;
      for (const name in option) {
        if (option.hasOwnProperty(name)) {
          // @ts-ignore
          this[name] = option[name];
        }
      }
    }
  }

  public run() {
    const duration = this.duration;
    let startTime = 0;
    const stepping = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp - this.pastTime;
      }
      const pastTime = timestamp - startTime;
      const progress = pastTime / duration;
      if (pastTime >= duration) {
        this.emitter.emit('update', blender(this.easing, this.reverse)(progress));
        if (this.loop) {
          startTime = timestamp;
        } else {
          this.pastTime = 0;
          this.rafId = 0;
          return;
        }
      }
      this.emitter.emit('update', blender(this.easing, this.reverse)(progress));
      this.pastTime = pastTime;
      this.rafId = root.requestAnimationFrame(stepping);
    };
    root.requestAnimationFrame(stepping);
    return this;
  }

  public on(eventName: string | BeltListener, listener: (...args: any[]) => void, context?: any) {
    if (typeof eventName === 'object' && eventName.constructor === Object) {
      const listenerMap = eventName;
      for (const key in listenerMap) {
        if (listenerMap.hasOwnProperty(key)) {
          this.emitter.on(key, listenerMap[key]);
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
      const listenerMap = eventName;
      for (const key in listenerMap) {
        if (listenerMap.hasOwnProperty(key)) {
          this.emitter.off(key, listenerMap[key]);
        }
      }
    }
    if (typeof eventName === 'string') {
      this.emitter.off(eventName, listener, context);
    }
    return this;
  }
}

export default Belt;
