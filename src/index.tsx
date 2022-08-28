import {
  definePlugin,
  Field,
  PanelSection,
  PanelSectionRow,
  ServerAPI,
  sleep,
  staticClasses,
} from 'decky-frontend-lib';
import { useEffect, useReducer, useState, VFC } from 'react';
import { BiBluetooth } from 'react-icons/all';
import { parseBluetoothStatus, parseDevices, parseDevicesInfo } from './utils';
import isEqual from 'lodash.isequal';
import { Device } from './components/device';
import { Spinner } from './components/spinner';

const Content: VFC<{ serverAPI: ServerAPI }> = ({ serverAPI }) => {
  const [status, setStatus] = useState<string>('LOADING');
  const [loading, setLoading] = useState<boolean>(false);
  const [devices, setDevices] = useReducer((previousValue: Device[], newValue: Device[]) => {
    if (isEqual(newValue, previousValue)) {
      return previousValue;
    }
    return newValue;
  }, []);

  const refreshStatus = async (serverAPI: ServerAPI, delay = 0) => {
    setLoading(true);
    const statusResponse = (await serverAPI.callPluginMethod('get_bluetooth_status', {})).result as string;

    const pairedDevicesResponse = (await serverAPI.callPluginMethod('get_paired_devices', {})).result as string;
    const pairedDevices = parseDevices(pairedDevicesResponse);

    const pairedDevicesWithInfoReponse = await Promise.all(pairedDevices.map(
      async pairedDevice => (await serverAPI.callPluginMethod('get_device_info', { device: pairedDevice.mac })).result as string)
    );
    const pairedDevicesWithInfo = parseDevicesInfo(pairedDevicesWithInfoReponse);
    console.log('pairedDevicesWithInfo: ', pairedDevicesWithInfo);

    await sleep(delay);
    setStatus(parseBluetoothStatus(statusResponse));
    setDevices(pairedDevicesWithInfo);
    setLoading(false);
  };

  useEffect(() => {
    void refreshStatus(serverAPI, 0);
  }, []);

  return (
    <div id='bluetooth'>
      <style dangerouslySetInnerHTML={{
        __html: `
      #QuickAccess-Menu > div[class^="quickaccessmenu_Menu_"].Panel.Focusable >
      div[class^="quickaccessmenu_PanelOuterNav_"].Panel.Focusable >
      div > div[class^="quickaccessmenu_ContentTransition_"][class*="quickaccessmenu_ActiveTab_"] >
      div > div[class^="quickaccessmenu_Title_"] > div {
        /* Force plugin title to be on a single line */
        flex-grow: 1 !important;
      }

      #bluetooth div[class^="quickaccesscontrols_PanelSection_"] {
        margin-bottom: 0;
      }

      .status, .devicesTitle, .connected {
        color: #dcdedf;
      }

      .disconnected {
        color: #67707b;
      }

      /* Force Fields content to be left aligned */
      .no-flex-grow > div[class^="gamepaddialog_FieldLabelRow_"] {
        justify-content: flex-start;
      }
      .no-flex-grow > div[class^="gamepaddialog_FieldLabelRow_"] > div[class^="gamepaddialog_FieldLabel_"] {
        flex-grow: 0;
      }
      .no-flex-grow > div[class^="gamepaddialog_FieldLabelRow_"] > div[class^="gamepaddialog_FieldChildren_"] {
        max-width: calc(100% - calc(32px + var(--field-row-children-spacing)))
      }

      .closer-description > div[class^="gamepaddialog_FieldDescription_"] {
        margin-top: 0;
        margin-left: calc(32px + var(--field-row-children-spacing));
      }
    ` }} />
      <PanelSection>
        <PanelSectionRow>
          <Field
            icon={<BiBluetooth />}
            className="status no-flex-grow"
          >
            <span>Bluetooth status: {status}</span>
          </Field>
        </PanelSectionRow>

        <PanelSectionRow>
          <Field
            className="devicesTitle"
            label="Paired devices">
            <Spinner loading={loading} refresh={() => refreshStatus(serverAPI, 300)}/>
          </Field>
        </PanelSectionRow>
      </PanelSection>
      <PanelSection>
        {devices.map(device => (
          <PanelSectionRow>
            <Device key={device.mac}
              device={device}
              serverAPI={serverAPI}
              refresh={() => refreshStatus(serverAPI, 0)}
              setLoading={(state: boolean) => setLoading(state)}
            />
          </PanelSectionRow>
        ))}
      </PanelSection>
    </div>
  );
};

export default definePlugin((serverApi: ServerAPI) =>
  ({
    title: <div className={staticClasses.Title}>Bluetooth</div>,
    content: <Content serverAPI={serverApi} />,
    icon: <BiBluetooth />,
  })
);