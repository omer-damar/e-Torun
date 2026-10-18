import { fireEvent, render, screen } from '@testing-library/react-native';

import { ConfirmDialog } from '@/components/ConfirmDialog';

describe('ConfirmDialog', () => {
  const setup = async (visible = true) => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(
      <ConfirmDialog
        visible={visible}
        title="112 aranacak"
        message="112 Acil Çağrı Merkezi aranacak. Emin misiniz?"
        onConfirm={onConfirm}
        onCancel={onCancel}
        confirmVariant="danger"
      />,
    );
    return { onConfirm, onCancel };
  };

  it('Evet ve Hayır butonlarını gösterir', async () => {
    await setup();

    expect(screen.getByText('112 Acil Çağrı Merkezi aranacak. Emin misiniz?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Evet' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hayır' })).toBeTruthy();
  });

  it('Evet → onConfirm, Hayır → onCancel', async () => {
    const { onConfirm, onCancel } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: 'Evet' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Hayır' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('görünür değilken hiçbir şey çizmez', async () => {
    await setup(false);

    expect(screen.queryByRole('button', { name: 'Evet' })).toBeNull();
  });
});
