import React from 'react';
import { TextInput } from 'react-native';
import { useTheme } from '../../../app/settings/SettingsContext';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
};

export default function SearchInput({ value, onChangeText, onSubmit, placeholder }: Props) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <TextInput
      style={s.input}
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmit}
      returnKeyType="search"
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
}

const useStyles = makeStyles(c => ({
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.surface,
    padding: spacing.md,
    fontSize: 16,
    color: c.text,
  },
}));
