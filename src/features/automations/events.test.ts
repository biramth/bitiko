import { describe, expect, it } from 'vitest'
import { AUTOMATION_EVENTS, renderPreview } from './events'

describe('renderPreview', () => {
  it('remplace les variables et vide les inconnues', () => {
    expect(renderPreview('Bonjour {{ name }}, {{unknown}}!', { name: 'Awa' })).toBe('Bonjour Awa, !')
  })
})

describe('AUTOMATION_EVENTS', () => {
  it('chaque variable annoncée a un libellé et une valeur d’exemple', () => {
    for (const event of AUTOMATION_EVENTS) {
      for (const variable of event.variables) {
        expect(event.variableLabels[variable], `${event.type}.${variable} label`).toBeTruthy()
        expect(event.sample[variable], `${event.type}.${variable} sample`).toBeTruthy()
      }
    }
  })

  it('les messages par défaut n’utilisent que des variables déclarées', () => {
    for (const event of AUTOMATION_EVENTS) {
      const used = [...`${event.defaultSubject} ${event.defaultBody}`.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1])
      for (const variable of used) expect(event.variables).toContain(variable)
    }
  })
})
