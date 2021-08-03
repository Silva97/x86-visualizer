export class ElementCollection {
    constructor(queries) {
        for (let name in queries) {
            this[name] = (queries[name] instanceof QueryElement)
                ? queries[name]
                : new QueryElement(queries[name]);
        }
    }
}

export class QueryElement {
    constructor(query) {
        this.element = document.querySelector(query);
        this.parent = this.element.parentElement;
    }

    event(eventType) {
        this.element.dispatchEvent(new Event(eventType));
        return this;
    }

    hide() {
        this.element.hidden = true;
        return this;
    }

    unhide() {
        this.element.hidden = false;
        return this;
    }

    html(content) {
        this.element.innerHTML = content;
        return this;
    }

    on(event, listener) {
        this.element.addEventListener(event, listener);
        return this;
    }

    text(value) {
        this.element.innerText = value;
        return this;
    }
}
