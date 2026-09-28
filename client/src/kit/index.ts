// The Kadmivo brand kit: the site's own building blocks. The home page is
// built from these, and the design system in Claude Design is synced from
// them (see .design-sync/).

// Motion
export { KadmivoProvider, type KadmivoProviderProps } from "./motion/KadmivoProvider";
export { Reveal, type RevealProps } from "./motion/Reveal";
export { DrawIcon, type DrawIconProps } from "./motion/DrawIcon";
export { ScrollProgress } from "./motion/ScrollProgress";
export { useFontsReady, useMotionKit, type EntranceProps, type MotionMode } from "./motion/core";

// Brand
export { BrandMark, type BrandMarkProps } from "./brand/BrandMark";
export { Icon, type IconProps } from "./brand/Icon";
export { iconNames, type IconName } from "./brand/glyphs";

// Typography
export { Eyebrow, type EyebrowProps } from "./typography/Eyebrow";
export { Heading, type HeadingProps } from "./typography/Heading";
export { Text, type TextProps } from "./typography/Text";

// Actions
export { Button, type ButtonProps } from "./actions/Button";
export { TextLink, type TextLinkProps } from "./actions/TextLink";
export { ArrowLink, type ArrowLinkProps } from "./actions/ArrowLink";
export { ActionRow, type ActionRowProps } from "./actions/ActionRow";

// Layout
export { NoticeBar, type NoticeBarProps } from "./layout/NoticeBar";
export { SiteHeader, type NavLink, type SiteHeaderProps } from "./layout/SiteHeader";
export { SiteFooter, type FooterColumn, type SiteFooterProps } from "./layout/SiteFooter";

// Content
export { TrustStrip, type TrustStripProps } from "./content/TrustStrip";
export { NumberedList, type NumberedListItem, type NumberedListProps } from "./content/NumberedList";
export { WorkflowSteps, type WorkflowStep, type WorkflowStepsProps } from "./content/WorkflowSteps";
export { RuleCallout, type RuleCalloutProps } from "./content/RuleCallout";
export { FeatureGrid, type Feature, type FeatureGridProps } from "./content/FeatureGrid";
export { Timeline, type TimelineItem, type TimelineProps } from "./content/Timeline";
export { PromiseList, type PromiseListProps } from "./content/PromiseList";

// Cards
export { OrderCard, type OrderCardProps, type OrderItem, type OrderStep } from "./cards/OrderCard";
export { ControlPanel, type ControlPanelProps, type ControlRow } from "./cards/ControlPanel";
export { PriceCard, type PriceCardProps } from "./cards/PriceCard";

// Forms
export { FormCard, type FormCardProps, type FormSubmitResult, type FormSuccessContent } from "./forms/FormCard";
export { FormGrid, type FormGridProps } from "./forms/FormGrid";
export { Field, type FieldProps } from "./forms/Field";
export { SelectField, type SelectFieldProps } from "./forms/SelectField";
export { TextAreaField, type TextAreaFieldProps } from "./forms/TextAreaField";
export { FormActions, type FormActionsProps } from "./forms/FormActions";
