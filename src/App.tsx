import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Button,
  Select,
  InputNumber,
  Input,
  Modal,
  Typography,
  Space,
  ConfigProvider,
  message,
  Tooltip,
} from "antd";
import {
  InfoCircleOutlined,
  ForkOutlined,
  PlusOutlined,
  CloseOutlined,
  UndoOutlined,
  LinkOutlined,
  SmileOutlined,
  FrownOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import gsap from "gsap";
import "./App.css";

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

const diceFaces: { [key: number]: string } = {
  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅",
};

const ACCENT = "#2f6fed";
const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const theme = {
  token: { colorPrimary: ACCENT, fontFamily: FONT_FAMILY, borderRadius: 8 },
};

const MAX_CUSTOM_SIDES = 100;
const MAX_CHOICES = 100;
const MAX_CHOICE_LENGTH = 100;
const MIN_CHOICE_ROWS = 2;
const PRESET_SIDES = [2, 3, 4, 6, 8, 10, 12, 20];

interface Choice {
  id: number;
  text: string;
  struck: boolean;
}

interface RollResult {
  roll: number;
  choiceId?: number;
}

// "relieved": the user liked the roll. "last": every other option was struck.
type Decided = "relieved" | "last" | null;

let nextChoiceId = 1;
const makeChoice = (text = ""): Choice => ({
  id: nextChoiceId++,
  text,
  struck: false,
});

const faceFor = (value: number, sides: number): string | number =>
  sides <= 6 && diceFaces[value] ? diceFaces[value] : value;

const readUrlState = () => {
  const params = new URLSearchParams(window.location.search);
  const choices = params
    .getAll("c")
    .map((text) => text.trim().slice(0, MAX_CHOICE_LENGTH))
    .filter((text) => text !== "")
    .slice(0, MAX_CHOICES)
    .map((text) => makeChoice(text));
  while (choices.length < MIN_CHOICE_ROWS) choices.push(makeChoice());

  const sidesParam = parseInt(params.get("d") || "", 10);
  const sides =
    sidesParam >= 2 && sidesParam <= MAX_CUSTOM_SIDES ? sidesParam : 6;

  return { choices, sides };
};

const DecisionMakerApp: React.FC = () => {
  const initial = useMemo(readUrlState, []);

  const [selectedDieKey, setSelectedDieKey] = useState<string>(
    PRESET_SIDES.includes(initial.sides) ? String(initial.sides) : "custom",
  );
  const [customSidesInput, setCustomSidesInput] = useState<number>(
    initial.sides,
  );
  const [choices, setChoices] = useState<Choice[]>(initial.choices);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [result, setResult] = useState<RollResult | null>(null);
  const [decided, setDecided] = useState<Decided>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [infoVisible, setInfoVisible] = useState<boolean>(false);
  const [animatedDieVisual, setAnimatedDieVisual] = useState<string | number>(
    "?",
  );
  const visualRef = useRef<HTMLDivElement>(null);

  const diceOptions = useMemo(
    () => [
      ...PRESET_SIDES.map((sides) => ({
        label: `D${sides}`,
        value: sides,
        key: String(sides),
      })),
      { label: "Custom", value: "custom", key: "custom" },
    ],
    [],
  );

  const plainSides = useMemo(() => {
    if (selectedDieKey === "custom") {
      return Math.max(2, customSidesInput);
    }
    return parseInt(selectedDieKey, 10) || 6;
  }, [selectedDieKey, customSidesInput]);

  const filledChoices = useMemo(
    () => choices.filter((c) => c.text.trim() !== ""),
    [choices],
  );
  const activeChoices = useMemo(
    () => filledChoices.filter((c) => !c.struck),
    [filledChoices],
  );
  // With two or more choices typed in, the die is sized to the choices.
  const choiceMode = filledChoices.length >= 2;
  const sides = choiceMode ? activeChoices.length : plainSides;

  const clearOutcome = () => {
    setResult(null);
    setDecided(null);
  };

  // Keep the URL in sync so a refresh keeps the choices and the link is shareable.
  useEffect(() => {
    const params = new URLSearchParams();
    filledChoices.forEach((c) => params.append("c", c.text.trim()));
    if (filledChoices.length < 2 && plainSides !== 6) {
      params.set("d", String(plainSides));
    }
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `?${query}` : window.location.pathname,
    );
  }, [filledChoices, plainSides]);

  // Crossed-off choices only make sense while two or more are still in play.
  // If an edit leaves fewer than that with no decision made, put them all back.
  useEffect(() => {
    if (choiceMode && !decided && !isRolling && activeChoices.length < 2) {
      setChoices((prev) => prev.map((c) => ({ ...c, struck: false })));
    }
  }, [choiceMode, decided, isRolling, activeChoices.length]);

  const handleDieTypeChange = (key: string) => {
    setSelectedDieKey(key);
    clearOutcome();
  };

  const handleCustomSidesInputChange = (value: number | null) => {
    clearOutcome();
    if (value === null) {
      setCustomSidesInput(2);
      return;
    }
    if (value >= 2) {
      setCustomSidesInput(Math.min(value, MAX_CUSTOM_SIDES));
      if (value > MAX_CUSTOM_SIDES) {
        message.warning(
          `Maximum custom sides is ${MAX_CUSTOM_SIDES}. Input capped.`,
          3,
        );
      }
    }
  };

  // pool: the choices being rolled for, or null for a plain numbered die.
  const rollDie = useCallback((pool: Choice[] | null, rollSides: number) => {
    const visualElement = visualRef.current;
    if (!visualElement || rollSides < 2) return;

    setIsRolling(true);
    setResult(null);
    setDecided(null);

    const totalFlashes = 15 + Math.floor(Math.random() * 10);
    const flashDuration = 0.075;

    const tl = gsap.timeline({
      onComplete: () => {
        const finalRoll = Math.floor(Math.random() * rollSides) + 1;
        setResult({
          roll: finalRoll,
          choiceId: pool ? pool[finalRoll - 1].id : undefined,
        });
        setAnimatedDieVisual(faceFor(finalRoll, rollSides));
        setIsRolling(false);
        gsap.fromTo(
          visualElement,
          { scale: 1.6, opacity: 0.6, rotation: 0 },
          { scale: 1, opacity: 1, duration: 0.5, ease: "elastic.out(1, 0.4)" },
        );
      },
    });

    gsap.set(visualElement, { rotation: 0 });
    tl.to(visualElement, {
      scale: 1.2,
      rotation: "random(-15,15)",
      duration: 0.1,
      ease: "power1.inOut",
    });

    for (let i = 0; i < totalFlashes; i++) {
      const isLastFewFlashes = i > totalFlashes - 5;
      tl.to(visualElement, {
        duration:
          flashDuration *
          (isLastFewFlashes ? 1.5 + (i - (totalFlashes - 5)) * 0.2 : 1),
        opacity: Math.random() * 0.4 + 0.6,
        scale: 1 + Math.random() * 0.3,
        rotation: `random(-30,30)deg`,
        ease: "power1.inOut",
        onStart: () => {
          const randomFlashValue = Math.floor(Math.random() * rollSides) + 1;
          setAnimatedDieVisual(faceFor(randomFlashValue, rollSides));
        },
      });
    }
    tl.to(visualElement, {
      opacity: 1,
      scale: 1,
      rotation: 0,
      duration: 0.3,
      ease: "power1.out",
    });
  }, []);

  const handleRollClick = () => {
    rollDie(choiceMode ? activeChoices : null, sides);
  };

  const handleRelieved = () => setDecided("relieved");

  // Strike the option the user didn't want, then roll again for the rest.
  const handleBummed = () => {
    if (!result || result.choiceId === undefined) return;
    const struckId = result.choiceId;
    const remaining = activeChoices.filter((c) => c.id !== struckId);
    setChoices((prev) =>
      prev.map((c) => (c.id === struckId ? { ...c, struck: true } : c)),
    );
    if (remaining.length === 1) {
      setResult({ roll: 1, choiceId: remaining[0].id });
      setDecided("last");
      setAnimatedDieVisual("✓");
    } else {
      rollDie(remaining, remaining.length);
    }
  };

  const handleStartOver = () => {
    setChoices((prev) => prev.map((c) => ({ ...c, struck: false })));
    clearOutcome();
  };

  const handleChoiceChange = (id: number, value: string) => {
    setChoices((prev) =>
      prev.map((c) => (c.id === id ? { ...c, text: value } : c)),
    );
    clearOutcome();
  };

  const addChoice = () => {
    if (choices.length >= MAX_CHOICES) {
      message.warning(`Maximum of ${MAX_CHOICES} choices.`, 3);
      return;
    }
    const choice = makeChoice();
    setChoices((prev) => [...prev, choice]);
    setFocusId(choice.id);
  };

  const removeChoice = (id: number) => {
    setChoices((prev) =>
      prev.length > MIN_CHOICE_ROWS
        ? prev.filter((c) => c.id !== id)
        : prev.map((c) =>
            c.id === id ? { ...c, text: "", struck: false } : c,
          ),
    );
    clearOutcome();
  };

  const restoreChoice = (id: number) => {
    setChoices((prev) =>
      prev.map((c) => (c.id === id ? { ...c, struck: false } : c)),
    );
    clearOutcome();
  };

  const handleChoiceEnter = (index: number) => {
    if (index === choices.length - 1) {
      addChoice();
    } else {
      setFocusId(choices[index + 1].id);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      message.success("Link copied. Send it to someone indecisive.", 3);
    } catch {
      message.error("Couldn't copy. Grab the link from the address bar.", 4);
    }
  };

  const resultChoice =
    result && result.choiceId !== undefined
      ? choices.find((c) => c.id === result.choiceId)
      : undefined;
  const hasStruck = choices.some((c) => c.struck);
  const idleVisual = sides <= 6 ? diceFaces[1] : "?";
  const dieVisual =
    !isRolling && result === null ? idleVisual : animatedDieVisual;

  return (
    <ConfigProvider theme={theme}>
      <div className="app-container">
        <header className="app-header">
          <Title level={2} className="app-title">
            <ForkOutlined rotate={90} className="app-title-icon" />
            Decision Maker
          </Title>
          <Tooltip title="How random results can help">
            <Button
              icon={<InfoCircleOutlined />}
              onClick={() => setInfoVisible(true)}
              type="text"
              shape="circle"
              className="info-button"
              aria-label="How random results can help"
            />
          </Tooltip>
        </header>

        <div className="layout-grid">
          <section className="panel">
            <h2 className="panel-title">What are you deciding between?</h2>
            <p className="panel-hint">
              {filledChoices.length === 1
                ? "Add one more and the die will roll for them."
                : "Type your options. The die sizes itself to match."}
            </p>
            <div className="choices-list-container">
              {choices.map((choice, index) => {
                const side = activeChoices.indexOf(choice) + 1;
                return (
                  <div className="choice-row" key={choice.id}>
                    <Input
                      value={choice.text}
                      onChange={(e) =>
                        handleChoiceChange(choice.id, e.target.value)
                      }
                      onPressEnter={() => handleChoiceEnter(index)}
                      placeholder={`Choice ${index + 1}`}
                      aria-label={`Choice ${index + 1}`}
                      maxLength={MAX_CHOICE_LENGTH}
                      disabled={isRolling || choice.struck}
                      size="large"
                      ref={(input) => {
                        if (input && choice.id === focusId) {
                          input.focus();
                          setFocusId(null);
                        }
                      }}
                      className={
                        choice.struck
                          ? "choice-input choice-struck"
                          : "choice-input"
                      }
                      prefix={
                        <span className="choice-side">
                          {choiceMode && side > 0 ? side : "–"}
                        </span>
                      }
                    />
                    {choice.struck ? (
                      <Tooltip title="Put it back">
                        <Button
                          type="text"
                          icon={<UndoOutlined />}
                          onClick={() => restoreChoice(choice.id)}
                          disabled={isRolling}
                          aria-label={`Restore choice ${index + 1}`}
                        />
                      </Tooltip>
                    ) : (
                      <Button
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={() => removeChoice(choice.id)}
                        disabled={isRolling}
                        className="choice-remove"
                        aria-label={`Remove choice ${index + 1}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <Space wrap className="choices-actions">
              <Button
                icon={<PlusOutlined />}
                onClick={addChoice}
                disabled={isRolling}
              >
                Add choice
              </Button>
              <Button
                icon={<LinkOutlined />}
                onClick={handleCopyLink}
                disabled={filledChoices.length === 0}
              >
                Copy link
              </Button>
              {hasStruck && !decided && (
                <Button
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={handleStartOver}
                  disabled={isRolling}
                >
                  Put all back
                </Button>
              )}
            </Space>
          </section>

          <section className="panel roll-panel">
            <div className="animated-dice-container">
              <div className="animated-dice-visual" ref={visualRef}>
                {dieVisual}
              </div>
            </div>

            {choiceMode ? (
              <p className="die-caption">
                {sides} {sides === 1 ? "side" : "sides"}, one per choice
              </p>
            ) : (
              <div className="die-picker">
                <span className="die-caption">No choices? Roll a number:</span>
                <Select
                  value={selectedDieKey}
                  onChange={handleDieTypeChange}
                  style={{ width: 104 }}
                  disabled={isRolling}
                  aria-label="Dice type"
                >
                  {diceOptions.map((opt) => (
                    <Option key={opt.key} value={opt.key}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
                {selectedDieKey === "custom" && (
                  <InputNumber
                    min={2}
                    max={MAX_CUSTOM_SIDES}
                    value={customSidesInput}
                    onChange={handleCustomSidesInputChange}
                    placeholder="Sides"
                    style={{ width: 88 }}
                    disabled={isRolling}
                    aria-label={`Custom sides, 2 to ${MAX_CUSTOM_SIDES}`}
                  />
                )}
              </div>
            )}

            {decided ? (
              <Button
                onClick={handleStartOver}
                className="roll-button"
                size="large"
                icon={<ReloadOutlined />}
              >
                Start over
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleRollClick}
                disabled={isRolling}
                loading={isRolling}
                className="roll-button"
                size="large"
              >
                {isRolling
                  ? "Rolling..."
                  : choiceMode
                    ? "Roll for it"
                    : `Roll D${sides}`}
              </Button>
            )}

            {result !== null && !resultChoice && (
              <div className="result-card">
                <div className="result-label">You rolled</div>
                <div className="result-choice">{result.roll}</div>
              </div>
            )}

            {result !== null && resultChoice && (
              <div className="result-card">
                <div className="result-label">
                  {decided === "relieved"
                    ? "Decided"
                    : decided === "last"
                      ? "That leaves"
                      : "The die says"}
                </div>
                <div className="result-choice">{resultChoice.text.trim()}</div>
                {decided === null && (
                  <>
                    <p className="gut-check-prompt">
                      Gut check. How does that feel?
                    </p>
                    <Space wrap style={{ justifyContent: "center" }}>
                      <Button
                        type="primary"
                        icon={<SmileOutlined />}
                        onClick={handleRelieved}
                      >
                        Relieved
                      </Button>
                      <Button icon={<FrownOutlined />} onClick={handleBummed}>
                        Bummed
                      </Button>
                    </Space>
                    <p className="gut-check-hint">
                      Bummed crosses it off and rolls again.
                    </p>
                  </>
                )}
                {decided === "relieved" && (
                  <p className="gut-check-prompt">Your gut agrees. Go do it.</p>
                )}
                {decided === "last" && (
                  <p className="gut-check-prompt">
                    You crossed off everything else. Sounds like you knew all
                    along.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        <Modal
          title={
            <>
              <InfoCircleOutlined style={{ marginRight: 8, color: ACCENT }} />{" "}
              How This Helps Your Decisions
            </>
          }
          open={infoVisible}
          onCancel={() => setInfoVisible(false)}
          footer={
            <Button
              key="ok"
              type="primary"
              onClick={() => setInfoVisible(false)}
            >
              Got it!
            </Button>
          }
          className="info-modal"
        >
          <Paragraph>
            Using a random outcome (like a dice roll) for a decision might seem
            counterintuitive, but it's a powerful tool for introspection.
          </Paragraph>
          <Paragraph>
            When the die lands on a choice, pay close attention to your
            immediate emotional reaction:
          </Paragraph>
          <ul>
            <li>
              <Text strong>Relief or Excitement?</Text> This might indicate the
              choice aligns with your true, perhaps subconscious, preference.
            </li>
            <li>
              <Text strong>Disappointment or Regret?</Text> This can signal that
              you actually lean away from that option, or towards another.
            </li>
          </ul>
          <Paragraph>
            This process doesn't make the decision *for* you, but rather
            illuminates your genuine feelings, helping you bypass overthinking
            and connect with your intuitive desires. That's what the gut check
            after each roll is for: tell it you're bummed and it crosses that
            option off and rolls again.
          </Paragraph>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default DecisionMakerApp;
