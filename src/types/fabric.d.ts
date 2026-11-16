declare module "fabric" {
  export const fabric: any;
  export default fabric;
}

declare global {
  interface Window {
    __cseFabric?: any;
    __cseCanvas?: any;
  }
}

export {};
