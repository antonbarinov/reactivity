import { autorun, reaction, reactive, when, markSynchronousReactions } from '../src';
import { sleep } from './helpers';



class Animal {
    name
    energyLevel

    constructor(name) {
        this.name = name
        this.energyLevel = 100
        reactive(this);
        markSynchronousReactions(this, 'energyLevel');
    }

    reduceEnergy() {
        this.energyLevel -= 10
    }

    get isHungry() {
        return this.energyLevel < 50
    }
}

const giraffe = new Animal("Gary")

autorun(() => {
    console.log("Energy level:", giraffe.energyLevel)
})

autorun(() => {
    if (giraffe.isHungry) {
        console.log("Now I'm hungry!")
    } else {
        console.log("I'm not hungry!")
    }
})

console.log("Now let's change state!");
(async () => {
    for (let i = 0; i < 10; i++) {
        giraffe.reduceEnergy()
        //await sleep(10);
    }
})();

