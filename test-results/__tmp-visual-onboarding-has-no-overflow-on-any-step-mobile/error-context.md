# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: __tmp-visual.spec.ts >> onboarding has no overflow on any step
- Location: e2e\__tmp-visual.spec.ts:6:1

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - img "Bitiko" [ref=e7]
    - heading "Espace boutique" [level=1] [ref=e12]
    - paragraph [ref=e13]: Connectez-vous pour gérer votre boutique
  - button "Continuer avec Google" [ref=e15]
  - generic [ref=e21]: ou avec votre email
  - generic [ref=e25]:
    - generic [ref=e26]:
      - generic [ref=e27]: Email
      - textbox "Email" [ref=e29]:
        - /placeholder: vous@exemple.com
        - text: e2e-visual-muh5u84c@bitiko-e2e.test
    - paragraph [ref=e30]: "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
    - button "Continuer" [active] [ref=e31]
  - paragraph [ref=e34]: Pas encore de boutique ? Entre ton email, on s'occupe du reste.
```