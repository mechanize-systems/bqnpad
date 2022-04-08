/**
 * React bindings to CodeMirror 6.
 */
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as React from "react";
import * as ReactDOMClient from "react-dom/client";

import * as Base from "@mechanize/base";

export type EditorConfig = {
  doc: State.Text;
  onUpdate?: (update: View.ViewUpdate) => void;
  extensions?: (undefined | State.Extension)[] | State.Extension;
};

export function useEditor<E extends HTMLElement>(
  ref: React.MutableRefObject<E | null>,
  view: React.MutableRefObject<View.EditorView | null>,
  config: EditorConfig,
) {
  let { doc, onUpdate, extensions } = config;
  let doc0 = Base.React.useMemoOnce(() => doc);

  let onUpdateExtension = useStateCompartment(
    view,
    () => View.EditorView.updateListener.of((update) => onUpdate?.(update)),
    [onUpdate],
  );

  React.useLayoutEffect(() => {
    let startState = State.EditorState.create({
      doc: doc0,
      extensions: [
        onUpdateExtension,
        (Array.isArray(extensions)
          ? extensions.filter(Boolean)
          : extensions
          ? extensions
          : []) as State.Extension,
      ],
    });
    view.current = new View.EditorView({
      state: startState,
      parent: ref.current!,
    });
    return () => {
      view.current?.destroy();
      view.current = null;
    };
  }, [ref, view, doc0, onUpdateExtension, extensions]);
}

/**
 * Produce a dynamically configured `State.Extension`.
 *
 * The extension is reconfigured whenever values mentioned in `deps` array
 * change.
 */
export function useStateCompartment(
  view: View.EditorView | React.RefObject<View.EditorView | null>,
  configure: () => State.Extension,
  deps: unknown[],
): State.Extension {
  let { compartment, extension } = React.useMemo(() => {
    let compartment = new State.Compartment();
    let extension = compartment.of(configure());
    return { compartment, extension };
  }, []); // eslint-disable-line
  React.useEffect(() => {
    let v = view instanceof View.EditorView ? view : view.current;
    if (v == null) return;
    v.dispatch({ effects: [compartment.reconfigure(configure())] });
  }, [view, ...deps]); // eslint-disable-line
  return extension;
}

/**
 * Inject value into State as a field.
 */
export function useStateField<T>(
  view: View.EditorView | React.RefObject<View.EditorView | null>,
  value: T,
  deps: unknown[] = [value],
) {
  let value0 = Base.React.useMemoOnce(() => value);
  let [field, effect] = React.useMemo(() => {
    let effect = State.StateEffect.define<T>();
    let field = State.StateField.define<T>({
      create() {
        return value0;
      },
      update(state, tr) {
        for (let e of tr.effects) if (e.is(effect)) return e.value;
        return state;
      },
    });
    return [field, effect] as const;
  }, [value0]);
  React.useEffect(() => {
    let v = view instanceof View.EditorView ? view : view.current;
    v?.dispatch({ effects: [effect.of(value)] });
  }, [view, effect, ...deps]); // eslint-disable-line
  return field;
}

export abstract class ReactWidget extends View.WidgetType {
  abstract render(): React.ReactChild;

  protected _container: null | {
    dom: HTMLDivElement;
    root: ReactDOMClient.Root;
  } = null;

  get container() {
    if (this._container == null) {
      let dom = document.createElement("div");
      dom.setAttribute("aria-hidden", "true");
      let root = ReactDOMClient.createRoot(dom);
      this._container = { dom, root };
    }
    return this._container;
  }

  get isMounted(): boolean {
    return this._container != null;
  }

  override toDOM(): HTMLElement {
    this.container.root.render(this.render());
    return this.container.dom;
  }

  override updateDOM(dom: HTMLElement): boolean {
    if (dom !== this.container.dom) return false;
    this.container.root.render(this.render());
    return true;
  }

  override destroy() {
    this.container.root.unmount();
    this._container = null;
  }
}
