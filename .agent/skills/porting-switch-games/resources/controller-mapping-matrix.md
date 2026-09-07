# Nintendo Switch Controller & Input Mapping Matrix

This reference provides production-grade input mapping strategies for translating PC mouse, keyboard, and gamepad controls to Nintendo Switch Joy-Cons, Pro Controllers, and Touch Screen.

---

## 1. Button Mapping Standards

| PC Win32 Virtual Key | Xbox / XInput | Nintendo Switch Joy-Con / Pro Controller | Typical Game Action |
| :--- | :--- | :--- | :--- |
| `VK_SPACE` / `'Z'` | A Button | **`HidNpadButton_A`** / `SDL_CONTROLLER_BUTTON_A` | Confirm / Jump / Primary Action |
| `VK_ESCAPE` / `'X'` | B Button | **`HidNpadButton_B`** / `SDL_CONTROLLER_BUTTON_B` | Cancel / Back / Dodge |
| `'C'` / `'J'` | X Button | **`HidNpadButton_X`** / `SDL_CONTROLLER_BUTTON_X` | Attack / Secondary Action |
| `'V'` / `'K'` | Y Button | **`HidNpadButton_Y`** / `SDL_CONTROLLER_BUTTON_Y` | Inventory / Use Item |
| `VK_SHIFT` / `VK_LSHIFT` | Left Bumper (LB) | **`HidNpadButton_L`** / `SDL_CONTROLLER_BUTTON_LEFTSHOULDER` | Dash / Run / Guard |
| `VK_CONTROL` | Right Bumper (RB) | **`HidNpadButton_R`** / `SDL_CONTROLLER_BUTTON_RIGHTSHOULDER` | Skill / Special Attack |
| `VK_LBUTTON` | Left Trigger (LT) | **`HidNpadButton_ZL`** / `SDL_CONTROLLER_AXIS_TRIGGERLEFT` | Aim / Heavy Attack |
| `VK_RBUTTON` | Right Trigger (RT) | **`HidNpadButton_ZR`** / `SDL_CONTROLLER_AXIS_TRIGGERRIGHT` | Shoot / Fire |
| `VK_RETURN` | Start / Menu | **`HidNpadButton_Plus`** / `SDL_CONTROLLER_BUTTON_START` | Pause / Main Menu |
| `VK_TAB` / `VK_BACK` | Back / View | **`HidNpadButton_Minus`** / `SDL_CONTROLLER_BUTTON_BACK` | Map / Quest Log |
| `VK_UP` / `'W'` | D-Pad Up | **`HidNpadButton_Up`** / Left Stick Up | Move Forward / Up |
| `VK_DOWN` / `'S'` | D-Pad Down | **`HidNpadButton_Down`** / Left Stick Down | Move Backward / Down |
| `VK_LEFT` / `'A'` | D-Pad Left | **`HidNpadButton_Left`** / Left Stick Left | Move Left / Strafe |
| `VK_RIGHT` / `'D'` | D-Pad Right | **`HidNpadButton_Right`** / Left Stick Right | Move Right / Strafe |
| `VK_F1` ... `VK_F12` | - | `HidNpadButton_StickL` / `StickR` Click | Quick Save / Quick Load |

---

## 2. Touch Screen Mouse Emulation

For point-and-click adventure games, RTS games, and visual novels, the Nintendo Switch multi-touch screen can emulate a Win32 USB mouse:

```c
#ifdef __SWITCH__
#include <switch.h>

void UpdateTouchMouse(LPPOINT mousePos, BOOL* leftMouseDown) {
    HidTouchScreenState state = {0};
    hidGetTouchScreenStates(&state, 1);

    if (state.count > 0) {
        // Map native 1280x720 capacitive touch coordinates to game resolution
        mousePos->x = (LONG)state.touches[0].x;
        mousePos->y = (LONG)state.touches[0].y;
        *leftMouseDown = TRUE;
    } else {
        *leftMouseDown = FALSE;
    }
}
#endif
```

- **Single Tap**: Emulates `WM_LBUTTONDOWN` followed by `WM_LBUTTONUP`.
- **Drag**: Emulates `WM_MOUSEMOVE` with `MK_LBUTTON`.
- **Two-Finger Tap**: Emulates `WM_RBUTTONDOWN` / `WM_RBUTTONUP` (context menu / cancel).

---

## 3. Analog Stick Deadzone Filtering

The Tegra X1 Joy-Con analog sticks produce raw coordinates between `-32768` and `+32767`. Always apply a radial or axial deadzone of **15–20%** to prevent Joy-Con drift:

```c
#define JOYCON_DEADZONE 5000

void ProcessAnalogStick(int rawX, int rawY, float* outX, float* outY) {
    if (abs(rawX) < JOYCON_DEADZONE) rawX = 0;
    if (abs(rawY) < JOYCON_DEADZONE) rawY = 0;

    *outX = (float)rawX / 32767.0f;
    *outY = (float)rawY / 32767.0f;
}
```

---

## 4. Single Joy-Con Horizontal Mode (Couch Co-op)

For 2-player local multiplayer games:
1. Configure `padSetPlayerHandheldStyle(PadHandheldStyle_SingleJoyCon)`.
2. Split button masks:
   - SL button maps to Left Trigger (`ZL`).
   - SR button maps to Right Trigger (`ZR`).
   - Analog stick handles navigation; D-Pad (buttons) handle actions.
