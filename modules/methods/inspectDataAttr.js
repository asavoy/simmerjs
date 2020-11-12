import { isUniqueSelector } from '../queryEngine'
import { validDataSelector } from './validationHelpers'
/**
 * Inspect the elements' IDs and add them to the CSS Selector
 * @param {array} hierarchy. The hierarchy of elements
 * @param {object} state. The current selector state (has the stack and specificity sum)
 */
export default function (hierarchy, state, validateSelector, config, query) {
  return hierarchy.reduce((selectorState, currentElem, index) => {
    if (!selectorState.verified) {
      const [bestAttribute] = currentElem.el.getAttributeNames()
        .filter((attrName) => attrName.indexOf('data-') === 0)
        .map((attrName) => {
          const value = currentElem.el.getAttribute(attrName)
          return value !== '' ? `[${attrName}='${value}']` : `[${attrName}]`
        })
        .filter(validDataSelector)
        .sort()
        .map((selector) => ({ selector, specificity: isUniqueSelector(query, selector) ? 100 : 50 }))
        .sort((a, b) => a.specificity - b.specificity)

      if (bestAttribute) {
        selectorState.stack[index].push(bestAttribute.selector)
        selectorState.specificity += bestAttribute.specificity

        if (selectorState.specificity >= config.specificityThreshold) {
          // we have reached the minimum specificity, lets try verifying now, as this will save us having to add more IDs to the selector
          if (validateSelector(selectorState)) {
            // The ID worked like a charm - mark this state as verified and move on!
            selectorState.verified = true
          }
        }

        if (!selectorState.verified && index === 0) {
          // if the index is 0 then this is the data-attr of the actual element! Which means we have found our selector!
          // The ID wasn't enough, this means the page, this should never happen as we tested for the data-attr's uniquness, but just incase
          // we will pop it from the stack as it only adds noise
          selectorState.stack[index].pop()
          selectorState.specificity -= bestAttribute.specificity
        }
      }
    }
    return selectorState
  }, state)
}
