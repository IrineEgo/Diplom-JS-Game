'use strict';

//Базовый класс игры: Vector (Вектор) - позволяет контролировать расположение объектов в двумерном пространстве и управлять их размером и перемещением.
class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    plus(vector) {
        if (!(vector instanceof Vector)) {
            throw new Error(`Можно прибавлять к вектору только вектор типа Vector`);
        }
        return new Vector(this.x + vector.x, this.y + vector.y);
    }

    times(factor = 1) {
        return new Vector(this.x * factor, this.y * factor);
    }
}

//Базовый класс игры: Actor (Движущийся объект) - позволяет контролировать все движущиеся объекты на игровом поле и контролировать их пересечение.
class Actor {
    constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
        if (!(pos instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
            throw new Error(`Можно передавать только объект типа Vector в качестве расположения, размера и скорости`);
        }
        this.pos = pos;
        this.size = size;
        this.speed = speed;
    }

    get type() {
        return 'actor';
    }

    act() {

    }

    get left() {
        return this.pos.x;
    }

    get right() {
        return this.pos.x + this.size.x;
    }

    get top() {
        return this.pos.y;
    }

    get bottom() {
        return this.pos.y + this.size.y;
    }

    isIntersect(actor) {
        if (!(actor instanceof Actor) || (!actor)) {
            throw new Error(`Не является объектом типа Actor или не были переданы аргументы`);
        }

        if (actor === this) {
            return false;
        }
        return (
            this.right > actor.left &&
            this.left < actor.right &&
            this.top < actor.bottom &&
            this.bottom > actor.top
        );
    }
}

//Базовый класс игры: Level (Игровое поле) - объекты класса реализуют схему игрового поля конкретного уровня, контролируют все движущиеся объекты на нём и реализуют логику игры.
class Level {
    constructor(grid = [], actors = []) {
        this.grid = grid.slice();
        this.actors = actors.slice();
        this.height = this.grid.length;
        this.width = this.grid.reduce((a, b) => {
            return b.length > a ? b.length : a;
    }, 0);
        this.status = null;
        this.finishDelay = 1;
        this.player = this.actors.find(act => act.type === 'player');
    }

    isFinished() {
        return this.status !== null && this.finishDelay < 0;
    }

    actorAt(actor) {
        if (!(actor instanceof Actor) || (!actor)) {
            throw new Error(`Не является объектом типа Actor или не были переданы аргументы`);
        }

        return this.actors.find(act => act.isIntersect(actor));
    }

    obstacleAt(pos, size) {
        if (!(pos instanceof Vector) && !(size instanceof Vector)) {
            throw new Error(`Не является вектором Vector`);
        }
        const left = Math.floor(pos.x);
        const right = Math.ceil(pos.x + size.x);
        const top = Math.floor(pos.y);
        const bottom = Math.ceil(pos.y + size.y);

        if (left < 0 || right > this.width || top < 0) {
            return 'wall';
        }
        if (bottom > this.height) {
            return 'lava';
        }
        for (let i = top; i < bottom; i++) {
            for (let k = left; k < right; k++) {
                const cross = this.grid[i][k];
                if (cross) {
                    return cross;
                }
            }
        }
    }

    removeActor(actor) {
        this.actors = this.actors.filter(el => el !== actor);
    }

    noMoreActors(type) {
        return !this.actors.some(el => el.type === type);
    }

    playerTouched(type, actor) {
        if (this.status !== null) {
            return;
        }
        if (type === 'lava' || type === 'fireball') {
            this.status = 'lost';
        }
        if (type === 'coin') {
            this.removeActor(actor);
            if (this.noMoreActors('coin')) {
                this.status = 'won';
            }
        }
    }
}

//LevelParser (Парсер уровня) -  позволяет создать игровое поле Level из массива строк
class LevelParser {
    constructor(dictionary) {
        this.dictionary = Object.assign({}, dictionary);
    }

    actorFromSymbol(symbol) {
        return this.dictionary[symbol];
    }

    obstacleFromSymbol(symbol) {
        if (symbol === 'x') {
            return 'wall';
        }
        if (symbol === '!') {
            return 'lava';
        }
    }

    createGrid(plan) {
        return plan.map(lowerString => lowerString.split('').map(symbol => this.obstacleFromSymbol(symbol)));
    }

    createActors(plan) {
        const actors = [];
        plan.map(el => el.split('')).forEach((row, y) => {
            row.forEach((cell, x) => {
            const constructor = this.actorFromSymbol(cell);
        if (constructor && typeof constructor === 'function') {
            const actor = new constructor(new Vector(x, y));
            if (actor instanceof Actor) {
                actors.push(actor);
            }
        }
    });
    });
        return actors;
    }

    parse(plan) {
        return new Level(this.createGrid(plan), this.createActors(plan));
    }
}

//Fireball (Шаровая молния) - прототип для движущихся опасностей на игровом поле
class Fireball extends Actor {
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
        super(pos, new Vector(1, 1), speed);
    }

    get type() {
        return 'fireball';
    }

    getNextPosition(time = 1) {
        return this.pos.plus(this.speed.times(time));
    }

    handleObstacle() {
        this.speed = this.speed.times(-1);
    }

    act(time, level) {
        const newPosition = this.getNextPosition(time);
        if (level.obstacleAt(newPosition, this.size)) {
            this.handleObstacle();
        } else {
            this.pos = newPosition;
        }
    }
}

//HorizontalFireball (Горизонтальная шаровая молния) - объект, который движется по горизонтали, при столкновении движется в обраную сторону
class HorizontalFireball extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        const speed = new Vector(2, 0);
        super(pos, speed);
    }
}

//VerticalFireball (Вертикальная шаровая молния) - объект, который движется по вертикали, при столкновении движется в обраную сторону
class VerticalFireball extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        const speed = new Vector(0, 2);
        super(pos, speed);
    }
}

//FireRain (Огненный дождь) - объект, который движется по вертикали, при столкновении движется в том же направлении
class FireRain extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        const speed = new Vector(0, 3);
        super(pos, speed);
        this.startPos = pos;
    }

    handleObstacle() {
        this.pos = this.startPos;
    }
}

//Coin (Монета) - реализует поведение монетки на игровом поле
class Coin extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = Math.random() * (Math.PI * 2);
        this.startPos = this.pos;
    }

    get type() {
        return 'coin';
    }

    updateSpring(time = 1) {
        this.spring = this.spring + this.springSpeed * time;
    }

    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }

    getNextPosition(time = 1) {
        this.updateSpring(time);
        return this.startPos.plus(this.getSpringVector());
    }

    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

// Player (Игрок) - содержит базовый функционал движущегося объекта, который представляет игрока на игровом поле
class Player extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
    }

    get type() {
        return 'player';
    }
}

//Запуск игры из четырех уровней, которые необходимо будет пройти последовательно
const schemas = [
    [
        '         ',
        '   f     ',
        '         ',
        '       oo',
        '@     xxx',
        '         ',
        'xxxx     ',
        '         '
    ],
    [
        '   v     ',
        '         ',
        '         ',
        '@       o',
        '    o   x',
        'o   x    ',
        'x        ',
        '         '
    ],
    [
        '            ',
        '      v     ',
        '           o',
        '@       o  x',
        '    o   x   ',
        '    x       ',
        'x           ',
        '            '
    ],
    [
        ' v           ',
        '             ',
        '             ',
        '@   h    o   ',
        '        xx   ',
        '    xx       ',
        'xx         o ',
        '      xxxxxxx'
    ]
];
const actorDict = {
    '@': Player,
    'v': VerticalFireball,
    'o': Coin,
    'h': HorizontalFireball,
    'f': FireRain
};
const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay)
    .then(() => alert('Вы выиграли!'));
