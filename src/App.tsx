import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  Select,
  InputNumber,
  Input,
  Modal,
  Typography,
  Space,
  Card,
  Divider,
  message,
  Tooltip,
} from "antd";
import {
  InfoCircleOutlined,
  ForkOutlined,
  CheckCircleOutlined,
  AppstoreAddOutlined,
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

const MAX_CUSTOM_SIDES = 100;

const DecisionMakerApp: React.FC = () => {
  const [selectedDieKey, setSelectedDieKey] = useState<string>("6");
  const [customSidesInput, setCustomSidesInput] = useState<number>(6);
  const [decisions, setDecisions] = useState<string[]>(Array(6).fill(""));
  const [result, setResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [infoVisible, setInfoVisible] = useState<boolean>(false);
  const [animatedDieVisual, setAnimatedDieVisual] = useState<string | number>(
    "?"
  );

  const diceOptions = useMemo(
    () => [
      { label: "D2", value: 2, key: "2" },
      { label: "D3", value: 3, key: "3" },
      { label: "D4", value: 4, key: "4" },
      { label: "D6", value: 6, key: "6" },
      { label: "D8", value: 8, key: "8" },
      { label: "D10", value: 10, key: "10" },
      { label: "D12", value: 12, key: "12" },
      { label: "D20", value: 20, key: "20" },
      { label: "Custom", value: "custom", key: "custom" },
    ],
    []
  );

  const actualSides = useMemo(() => {
    if (selectedDieKey === "custom") {
      return Math.max(2, customSidesInput);
    }
    const selectedOption = diceOptions.find(
      (opt) => opt.key === selectedDieKey
    );
    return selectedOption ? (selectedOption.value as number) : 6;
  }, [selectedDieKey, customSidesInput, diceOptions]);

  useEffect(() => {
    setDecisions((prevDecisions) => {
      const newArray = [...prevDecisions];
      if (actualSides > newArray.length) {
        return [...newArray, ...Array(actualSides - newArray.length).fill("")];
      } else if (actualSides < newArray.length) {
        return newArray.slice(0, actualSides);
      }
      return newArray;
    });
    setResult(null);
    setAnimatedDieVisual(actualSides <= 6 && diceFaces[1] ? diceFaces[1] : "?");
  }, [actualSides]);

  const handleDieTypeChange = (key: string) => {
    setSelectedDieKey(key);
  };

  const handleCustomSidesInputChange = (value: number | null) => {
    if (value === null) {
      setCustomSidesInput(2);
      if (selectedDieKey !== "custom") setSelectedDieKey("custom");
      return;
    }
    if (value >= 2) {
      const validValue = Math.min(value, MAX_CUSTOM_SIDES);
      setCustomSidesInput(validValue);
      if (selectedDieKey !== "custom") {
        setSelectedDieKey("custom");
      }
      if (value > MAX_CUSTOM_SIDES) {
        message.warning(
          `Maximum custom sides is ${MAX_CUSTOM_SIDES}. Input capped.`,
          3
        );
      }
    }
  };

  const rollDie = useCallback(() => {
    setIsRolling(true);
    setResult(null);

    const visualElement = document.querySelector(".animated-dice-visual");
    if (!visualElement) {
      setIsRolling(false);
      return;
    }

    const totalFlashes = 15 + Math.floor(Math.random() * 10);
    const flashDuration = 0.075;

    const tl = gsap.timeline({
      onComplete: () => {
        const finalRoll = Math.floor(Math.random() * actualSides) + 1;
        setResult(finalRoll);
        setAnimatedDieVisual(
          actualSides <= 6 && diceFaces[finalRoll]
            ? diceFaces[finalRoll]
            : finalRoll
        );
        setIsRolling(false);
        gsap.fromTo(
          visualElement,
          { scale: 1.6, opacity: 0.6, rotation: 0 },
          { scale: 1, opacity: 1, duration: 0.5, ease: "elastic.out(1, 0.4)" }
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
          const randomFlashValue = Math.floor(Math.random() * actualSides) + 1;
          setAnimatedDieVisual(
            actualSides <= 6 && diceFaces[randomFlashValue]
              ? diceFaces[randomFlashValue]
              : randomFlashValue
          );
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
  }, [actualSides]);

  const handleDecisionChange = (index: number, value: string) => {
    const newDecisions = [...decisions];
    newDecisions[index] = value;
    setDecisions(newDecisions);
  };

  return (
    <div className="app-container">
      <Card className="main-card" variant="borderless">
        <Title level={2} className="app-title">
          <ForkOutlined style={{ marginRight: 8 }} /> Decision Maker Deluxe
        </Title>

        <div className="layout-grid">
          <div className="grid-column-main">
            <Card
              title="Configure Your Destiny"
              variant="borderless"
              styles={{ header: { borderBottom: "none", paddingBottom: 0 } }}
              className="config-card"
            >
              <Space wrap size="middle" align="end" style={{ rowGap: "16px" }}>
                {" "}
                {/* Added rowGap */}
                <Space direction="vertical">
                  <Text strong>Dice Type:</Text>
                  <Select
                    value={selectedDieKey}
                    onChange={handleDieTypeChange}
                    style={{ width: 150 }}
                    className="dice-select"
                    size="large"
                  >
                    {diceOptions.map((opt) => (
                      <Option key={opt.key} value={opt.key}>
                        {opt.label}
                      </Option>
                    ))}
                  </Select>
                </Space>
                {selectedDieKey === "custom" && (
                  <Space direction="vertical">
                    <Text strong>Custom Sides (2-{MAX_CUSTOM_SIDES}):</Text>
                    <InputNumber
                      min={2}
                      max={MAX_CUSTOM_SIDES}
                      value={customSidesInput}
                      onChange={handleCustomSidesInputChange}
                      placeholder="Sides"
                      style={{ width: 150 }}
                      size="large"
                      disabled={isRolling}
                    />
                  </Space>
                )}
                <Tooltip title="How random results can help">
                  <Button
                    icon={<InfoCircleOutlined />}
                    onClick={() => setInfoVisible(true)}
                    type="text"
                    shape="circle"
                    size="large"
                    className="info-button-custom"
                  />
                </Tooltip>
              </Space>
            </Card>

            <div className="roll-section">
              <div className="animated-dice-container">
                <div className="animated-dice-visual">{animatedDieVisual}</div>
              </div>
              <Button
                type="primary"
                onClick={rollDie}
                disabled={isRolling}
                loading={isRolling}
                className="roll-button"
                size="large"
                icon={<CheckCircleOutlined />}
              >
                {isRolling ? "Rolling..." : `Roll D${actualSides}!`}
              </Button>

              {result !== null && (
                <Card className="result-card" variant="borderless">
                  <Title
                    level={4}
                    style={{ marginBottom: 5, color: "#1890ff" }}
                  >
                    Outcome:
                  </Title>
                  <Paragraph className="result-number">
                    You rolled a{" "}
                    <Text strong style={{ fontSize: "1.5em" }}>
                      {result}
                    </Text>
                  </Paragraph>
                  {decisions[result - 1] &&
                    decisions[result - 1].trim() !== "" && (
                      <Paragraph className="result-decision-text">
                        <Text strong>Your Decided Choice:</Text>{" "}
                        <Text
                          keyboard
                          style={{ padding: "3px 7px", fontSize: "1.1em" }}
                        >
                          {decisions[result - 1]}
                        </Text>
                      </Paragraph>
                    )}
                </Card>
              )}
            </div>
          </div>

          <div className="grid-column-choices">
            {actualSides > 0 && (
              <Card
                title="Define Your Choices (Optional)"
                variant="borderless"
                styles={{ header: { borderBottom: "none", paddingBottom: 0 } }}
                className="choices-card"
              >
                <Paragraph
                  type="secondary"
                  style={{ marginTop: -10, marginBottom: 15 }}
                >
                  Enter up to {actualSides} choices.
                </Paragraph>
                <div className="choices-list-container">
                  {decisions.map((decision, index) => (
                    <Input
                      key={index}
                      value={decision}
                      onChange={(e) =>
                        handleDecisionChange(index, e.target.value)
                      }
                      placeholder={`Choice ${index + 1}`}
                      disabled={isRolling}
                      className="choice-input"
                      prefix={
                        <AppstoreAddOutlined
                          style={{ color: "rgba(0,0,0,0.25)" }}
                        />
                      }
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </Card>

      <Modal
        title={
          <>
            <InfoCircleOutlined style={{ marginRight: 8, color: "#1890ff" }} />{" "}
            How This Helps Your Decisions
          </>
        }
        open={infoVisible}
        onCancel={() => setInfoVisible(false)}
        footer={
          <Button key="ok" type="primary" onClick={() => setInfoVisible(false)}>
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
          When the die lands on a choice, pay close attention to your immediate
          emotional reaction:
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
          illuminates your genuine feelings, helping you bypass overthinking and
          connect with your intuitive desires. Use this insight to make a more
          confident final choice!
        </Paragraph>
      </Modal>
    </div>
  );
};

export default DecisionMakerApp;
