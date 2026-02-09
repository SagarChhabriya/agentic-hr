// Type declarations for JSX files
declare module '*.jsx' {
  import { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}

declare module '*.js' {
  const value: any;
  export default value;
}
