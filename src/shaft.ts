import Gear, { Hub } from './gear';
import Belt, { FrameData } from './belt';

class Shaft {
  public static duration(gears: Gear[] | Hub[]) {
    let duration = 0;
    for (let i = 0, n = gears.length; i < n; i = i + 1) {
      const gear = gears[i];
      duration = duration + gear.option('delay') + gear.option('duration');
    }
    return duration;
  }

  private gears: Hub[] = [];

  constructor(gears: Gear[], private belt: Belt) {
    for (let i = 0, n = gears.length; i < n; i = i + 1) {
      this.gears.push(new Hub(gears[i]));
    }
    this.calculate();
    belt.on('pause', this.handlePauseBelt);
    belt.on('stop', this.handleStopBelt);
  }

  public duration() {
    return Shaft.duration(this.gears);
  }

  public update({ pastTime, isForward }: FrameData) {
    for (let i = 0, n = this.gears.length; i < n; i = i + 1) {
      const gear = this.gears[i];
      const waitTime = isForward ? gear.forwardWait() : gear.reverseWait();
      const duration = gear.option('duration');
      if (waitTime < pastTime && waitTime + duration >= pastTime) {
        if (gear.isPaused()) {
          gear.start();
        }
        const progress = (pastTime - waitTime) / duration;
        gear.update(isForward ? progress : 1 - progress);
      } else if (!gear.isPaused()) {
        gear.update(isForward ? 1 : 0);
        gear.done();
      }
    }
  }

  public calculate() {
    for (let i = 0, n = this.gears.length; i < n; i = i + 1) {
      const currGear = this.gears[i];
      const prevGear = this.gears[i - 1];
      if (i === 0) {
        currGear.forwardWait(currGear.option('delay'));
      } else {
        currGear.forwardWait(prevGear.forwardWait() + prevGear.option('duration') + currGear.option('delay'));
      }
      currGear.reverseWait(this.belt.option('duration') - (currGear.forwardWait() + currGear.option('duration')));
    }
  }

  private handlePauseBelt = () => {
    for (let i = 0, n = this.gears.length; i < n; i = i + 1) {
      this.gears[i].pause();
    }
  };

  private handleStopBelt = () => {
    for (let i = 0, n = this.gears.length; i < n; i = i + 1) {
      this.gears[i].stop();
    }
  };
}

export default Shaft;
export { FrameData };
