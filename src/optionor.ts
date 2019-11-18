import EventEmitter from 'eventemitter3';

interface Option {
  duration: number;
  loop: boolean;
  reverse: boolean;
  round: boolean;
  easing: EasingFn;
}

type EasingFn = (n: number) => number;

function stringify(object: {}) {
  return JSON.stringify(object, (_, value) => {
    return typeof value === 'function' ? value.toString() : value;
  });
}

class Optionor {
  private emitter: EventEmitter = new EventEmitter();
  private duration: number;
  private loop: boolean;
  private reverse: boolean;
  private round: boolean;
  private easing: EasingFn;

  constructor(option: Partial<Option> = {}) {
    this.duration = option.duration ?? 0;
    this.loop = option.loop ?? false;
    this.reverse = option.reverse ?? false;
    this.round = option.round ?? false;
    this.easing = option.easing ?? ((n: number) => n);
  }

  public listen(listener: (changedOption: Partial<Option>, prevOption: Option, nextOption: Option) => void, context?: any) {
    this.emitter.on('update', listener, context);
  }

  public all(): Option {
    return {
      duration: this.duration,
      loop: this.loop,
      reverse: this.reverse,
      round: this.round,
      easing: this.easing,
    };
  }

  public get<T extends keyof Option>(key: T): Option[T];
  public get<T extends keyof Option>(key?: T): undefined;
  public get<T extends keyof Option>(key?: T): Option[T] | undefined {
    if (key !== undefined) {
      // @ts-ignore
      return this[key];
    }
  }

  public set<T extends keyof Option>(key: T, value: Option[T]) {
    if (!key || value === undefined || this.get(key) === value) {
      return;
    }
    const currOption = this.all();
    const nextOption = { ...currOption, [key]: value };
    const changedOption = {} as Partial<Option>;
    // @ts-ignore
    this[key] = changedOption[key] = value;
    this.emitter.emit('update', changedOption, currOption, nextOption);
  }

  public merge(values: Partial<Option>) {
    if (stringify(values) === '{}') {
      return;
    }
    const currOption = this.all();
    const nextOption = { ...currOption, ...values };
    const changedOption = {} as Partial<Option>;
    let key: keyof Option;
    for (key in currOption) {
      if (currOption.hasOwnProperty(key) && currOption[key] !== nextOption[key]) {
        // @ts-ignore
        this[key] = changedOption[key] = nextOption[key];
      }
    }
    if (stringify(changedOption) !== '{}') {
      this.emitter.emit('update', changedOption, currOption, nextOption);
    }
  }
}

export default Optionor;
export { Option, EasingFn };
