/* eslint-disable max-len */
import { ActionDefinition, Definition, ElementDefinition, EventDefinition, FunctionDefinition, Kind, Linked, LinkedEntityDefinition, LinkedModel, ServiceDefinition } from "./types";
import { cwdRequireCDS, memorized } from "./utils";

const REP_REG = /[-_\.]/g;

type WithElements = { elements: { [key: string]: ElementDefinition } };

/**
 * ignore underscore and dot and uppercase char
 * 
 * @param n 
 * @returns 
 */
const normalizeIdentifier = memorized(function normalizeIdentifier(n: string) { return n.replace(REP_REG, "").toLowerCase(); }, 1, 100);

const findElement = memorized(function findElement(struct: WithElements, name: string): ElementDefinition | undefined {
  if (struct?.elements !== undefined) {
    const iName = normalizeIdentifier(name);
    for (const [elementName, elementDef] of Object.entries(struct.elements)) {
      if (normalizeIdentifier(elementName) === iName) {
        return elementDef;
      }
    }
  }
});

/**
 * find def by filter
 * 
 * @param kind 
 * @param name 
 * @param model the model, for multi-tenancy, the object should be different
 * @returns 
 */

const find = memorized(
  (kind: Kind, name: string, model?: LinkedModel): Definition | undefined => {
    const cds = cwdRequireCDS();
    model = model ?? cds.model;

    const getDefinition = (defName: string): Definition | undefined => {
      const normalizedDefName = normalizeIdentifier(defName);
      const definition = model.definitions[normalizedDefName];
      if (definition && definition.kind === kind) {
        return definition;
      }
      return undefined;
    };

    const findInEntities = (): Definition | undefined => {
      if (kind === "action" || kind === "function") {
        for (const entity of model.each("entity")) {
          const actions = Object.values(entity?.actions ?? []);
          for (const action of actions.filter(a => a.kind === kind)) {
            const actionName = `${entity.name}.${action.name}`;
            if (normalizeIdentifier(actionName).endsWith(iName)) {
              return action;
            }
          }
        }
      }
      return undefined;
    };

    const iName = normalizeIdentifier(name);

    if (model.definitions[name]?.kind === kind) {
      return model.definitions[name];
    }

    if (name.endsWith("_drafts")) {
      const draftDef = find(kind, name.substring(0, name.length - 7), model);
      if (draftDef?.drafts?.name !== undefined && normalizeIdentifier(draftDef.drafts?.name) === iName) {
        return draftDef;
      }
    }

    if (getDefinition(iName)) {
      return getDefinition(iName);
    }

    const defs = Object.values(model.definitions).filter(def => def.kind === kind);

    for (const def of defs) {
      if (normalizeIdentifier(def.name).endsWith(iName)) {
        return def;
      }
    }

    return findInEntities();
  }
);


    // find with full namespace
    for (const def of defs) {
      if (iName === normalizeIdentifier(def.name)) {
        return def;
      }
    }

    // find without namespace
    for (const def of defs) {
      if (normalizeIdentifier(def.name).endsWith(iName)) {
        return def;
      }
    }

    // find bounded action/function without namespace
    if (kind === "action" || kind === "function") {
      for (const entity of model.each("entity")) {
        const entityName = entity.name;
        const actions = Object.values(entity?.actions ?? []);
        for (const action of actions.filter(a => a.kind === kind)) {
          const actionName = `${entityName}.${action.name}`;
          if (normalizeIdentifier(actionName).endsWith(iName)) {
            return action;
          }
        }
      }
    }
  }, 3, 500);

/**
 * fuzzy utils for cds reflection
 */
export const fuzzy = {
  /**
   * find entity in model
   * 
   * @param name 
   * @param model 
   * @returns 
   */
  findEntity(name: string, model?: LinkedModel): LinkedEntityDefinition | undefined { return find("entity", name, model) as any; },
  /**
   * find event in model
   * 
   * @param name 
   * @param model 
   * @returns 
   */
  findEvent(name: string, model?: LinkedModel): Linked<EventDefinition> | undefined { return find("event", name, model) as any; },
  /**
   * find action in model
   * @param name 
   * @param model 
   * @returns 
   */
  findAction(name: string, model?: LinkedModel): Linked<ActionDefinition> | undefined { return find("action", name, model) as any; },
  /**
   * find function in model
   * @param name 
   * @param model 
   * @returns 
   */
  findFunction(name: string, model?: LinkedModel): Linked<FunctionDefinition> | undefined { return find("function", name, model) as any; },
  /**
   * find service in model
   * @param name 
   * @param model 
   * @returns 
   */
  findService(name: string, model?: LinkedModel): Linked<ServiceDefinition> | undefined { return find("service", name, model) as any; },
  /**
   * find entity in definition
   * 
   * @param entityDef 
   * @param name 
   * @returns 
   */
  findElement: findElement
};


