import React from 'react';
import { Pressable, Text } from 'react-native';
import { makeStyles } from '../../../theme/makeStyles';

export type OptionState = 'idle' | 'correct' | 'wrong' | 'dimmed';

/** Çoktan seçmeli şık düğmesi: cevaptan sonra yeşil / kırmızı / soluk */
export default function OptionButton({
  label,
  state,
  onPress,
  disabled,
}: {
  label: string;
  state: OptionState;
  onPress: () => void;
  disabled?: boolean;
}) {
  const s = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[s.btn, state === 'correct' && s.correct, state === 'wrong' && s.wrong, state === 'dimmed' && s.dimmed]}
      accessibilityRole="button">
      <Text style={[s.text, (state === 'correct' || state === 'wrong') && s.textOn]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(c => ({
  btn: {
    marginTop: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  correct: { backgroundColor: c.success, borderColor: c.success },
  wrong: { backgroundColor: c.danger, borderColor: c.danger },
  dimmed: { opacity: 0.45 },
  text: { fontSize: 18, fontWeight: '600', color: c.text, textAlign: 'center' },
  textOn: { color: c.white },
}));
