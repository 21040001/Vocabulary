import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
};

export default function SearchInput({ value, onChangeText, onSubmit, placeholder }: Props) {
  return (
    <TextInput
      style={s.input}
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmit}
      returnKeyType="search"
      placeholder={placeholder ?? 'Search an English word...'}
      placeholderTextColor={colors.textSecondary}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
}

const s = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
});
