/**
 * Yedeği dosyaya kaydetme / dosyadan yükleme (telefonun dosya seçicisi ile).
 * Kullanıcı yeri kendisi seçer: İndirilenler, Google Drive, Telegram'a göndermek vb.
 *
 * Gerekli paketler:
 *   @react-native-documents/picker  (dosya seç / kaydet)
 *   @dr.pogodin/react-native-fs      (geçici dosyayı yaz / oku)
 */
import { errorCodes, isErrorWithCode, keepLocalCopy, pick, saveDocuments, types } from '@react-native-documents/picker';
import { CachesDirectoryPath, readFile, unlink, writeFile } from '@dr.pogodin/react-native-fs';
import { backupFileName, BackupSummary, createBackup, parseBackup, restoreBackup, summarize } from './backup';

const isCancel = (e: unknown) => isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED;
const toPath = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''));

export type ExportResult = { status: 'saved'; summary: BackupSummary } | { status: 'cancelled' };

/** Yedeği oluşturur ve kullanıcının seçtiği yere kaydeder. */
export async function exportBackupToFile(): Promise<ExportResult> {
  const backup = await createBackup();
  const name = backupFileName();
  const path = `${CachesDirectoryPath}/${name}`;
  await writeFile(path, JSON.stringify(backup), 'utf8');
  try {
    const [res] = await saveDocuments({
      sourceUris: [`file://${path}`],
      mimeType: 'application/json',
      fileName: name,
      copy: false,
    });
    if (res.error) {
      throw new Error(res.error);
    }
    return { status: 'saved', summary: summarize(backup) };
  } catch (e) {
    if (isCancel(e)) {
      return { status: 'cancelled' };
    }
    throw e;
  } finally {
    unlink(path).catch(() => undefined);
  }
}

export type PickedBackup = { status: 'picked'; summary: BackupSummary; apply: () => Promise<BackupSummary> } | { status: 'cancelled' };

/**
 * Kullanıcıya dosya seçtirir ve doğrular. Henüz bir şey yazmaz:
 * ekran özeti gösterip onay alınca `apply()` çağrılır.
 * Geçersiz dosyada BackupError fırlatır.
 */
export async function pickBackupFile(): Promise<PickedBackup> {
  let text: string;
  try {
    // Bazı dosya yöneticileri .json'u "application/octet-stream" olarak gösterir, o yüzden hepsi
    const [file] = await pick({ type: [types.json, types.plainText, types.allFiles] });
    const [copy] = await keepLocalCopy({
      files: [{ uri: file.uri, fileName: file.name ?? 'backup.json' }],
      destination: 'cachesDirectory',
    });
    if (copy.status !== 'success') {
      throw new Error(copy.copyError);
    }
    const path = toPath(copy.localUri);
    text = await readFile(path, 'utf8');
    unlink(path).catch(() => undefined);
  } catch (e) {
    if (isCancel(e)) {
      return { status: 'cancelled' };
    }
    throw e;
  }
  const backup = parseBackup(text);
  return { status: 'picked', summary: summarize(backup), apply: () => restoreBackup(backup) };
}
