declare module 'virtual:wisp-docs' {
  export interface ComponentSummary {
    slug: string;
    title: string;
    group: string;
    summary: string;
    exports: string[];
  }
  export interface GuideSummary {
    slug: string;
    title: string;
    description: string;
    section: string;
    order: number;
  }
  export interface SearchEntry {
    title: string;
    path: string;
    kind: 'Guide' | 'Component' | 'Section' | 'Prop';
    context?: string;
    text: string;
  }
  export const components: ComponentSummary[];
  export const guides: GuideSummary[];
  export const componentLoaders: Record<
    string,
    () => Promise<{ default: import('virtual:wisp-docs/component/_').default }>
  >;
  export const guideLoaders: Record<
    string,
    () => Promise<{ default: import('virtual:wisp-docs/guide/_').GuidePageData }>
  >;
}

declare module 'virtual:wisp-docs/component/*' {
  export interface PropDoc {
    name: string;
    type: string;
    optional: boolean;
    default?: string;
    deprecated?: boolean;
    description: string;
  }
  export interface ComponentPageData {
    slug: string;
    title: string;
    group: string;
    importName: string;
    lede: string;
    description: string;
    components: {
      name: string;
      description: string;
      usage?: string;
      elements: string[];
      props: PropDoc[];
    }[];
    stories: { file: string; name: string; title: string; description: string; code?: string }[];
  }
  const page: ComponentPageData;
  export default page;
}

declare module 'virtual:wisp-docs/guide/*' {
  export interface GuidePageData {
    title: string;
    description: string;
    section: string;
    html: string;
    headings: { id: string; text: string; depth: number }[];
  }
  const page: GuidePageData;
  export default page;
}

declare module 'virtual:wisp-docs/themes.css' {}

declare module 'virtual:wisp-docs/partial/*' {
  const html: string;
  export default html;
}

declare module 'virtual:wisp-docs/search' {
  import type { SearchEntry } from 'virtual:wisp-docs';

  const entries: SearchEntry[];
  export default entries;
}
