// MedCost UI primitives ("Calm Ledger", docs/design-system.md §5).
// Files marked "use client" keep that boundary when imported through here.

// Icons
export { Icon, type IconName } from "./Icon";

// Layout
export { PageShell } from "./PageShell";
export { PageHeader } from "./PageHeader";
export { BackLink } from "./BackLink";
export { SectionHeader } from "./SectionHeader";
export { PageNotes } from "./PageNotes";

// Actions
export { Button, ButtonLink, buttonClass, type ButtonBase } from "./Button";
export { ActionLink } from "./ActionLink";
export { InlineLink, ExtLink, INLINE_LINK_CLASS } from "./InlineLink";
export { IconButton } from "./IconButton";
export { NewTabNote } from "./NewTabNote";

// Containers and lists
export { Card } from "./Card";
export { TaskTile } from "./TaskTile";
export { InsetGroup } from "./InsetGroup";
export { ListRow } from "./ListRow";
export { Disclosure } from "./Disclosure";
export { Callout } from "./Callout";
export { EmptyState } from "./EmptyState";
export { Badge } from "./Badge";
export { StatTile } from "./StatTile";
export { Table, TableCell } from "./Table";
export { Skeleton } from "./Skeleton";

// Prices and provenance
export { Money, MoneyRange, LakhCaption } from "./Money";
export { PriceFigure } from "./PriceFigure";
export { SourceNote, type MethodAnchor } from "./SourceNote";
export { RangeBar } from "./RangeBar";
export { PriceCompare } from "./PriceCompare";
export { VerdictCard, StatusLine } from "./VerdictCard";
export { PatientReported } from "./PatientReported";
export { PrivacyNote } from "./PrivacyNote";
export { DataText } from "./DataText";

// Forms
export { TextField, MoneyField, PinField, type FieldBase } from "./TextField";
export { Select } from "./Select";
export { Combobox, type ComboOption } from "./Combobox";
export { SegmentedControl } from "./SegmentedControl";
export { ChoiceChip, ChipRow } from "./ChoiceChip";
export { ChoiceList } from "./ChoiceList";
export { PhotoInput } from "./PhotoInput";
export { ErrorSummary } from "./ErrorSummary";
export { StepHeader } from "./StepHeader";
export { ProgressBar } from "./ProgressBar";
export { StickyActionBar } from "./StickyActionBar";
export { Sheet } from "./Sheet";
export { LanguageSwitch } from "./LanguageSwitch";
export { ThemeSwitch } from "./ThemeSwitch";
export { LiveRegionProvider, useAnnounce } from "./LiveRegion";
