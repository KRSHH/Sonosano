/// <reference types="vite/client" />

declare module '*.module.css' {
    const classes: { [key: string]: string }
    export default classes
}

declare module '*.png' {
    const src: string
    export default src
}

declare module '*.jpg' {
    const src: string
    export default src
}

declare module '*.jpeg' {
    const src: string
    export default src
}

declare module '*.svg' {
    const src: string
    export default src
}

declare module '*.gif' {
    const src: string
    export default src
}
