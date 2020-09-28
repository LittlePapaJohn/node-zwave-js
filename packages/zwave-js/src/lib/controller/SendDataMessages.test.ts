import { BasicCCGet } from "../commandclass/BasicCC";
import { NoOperationCC } from "../commandclass/NoOperationCC";
import type { Driver } from "../driver/Driver";
import { FunctionType, MessageType } from "../message/Constants";
import {
	getExpectedCallback,
	getExpectedResponse,
	getFunctionType,
	getMessageType,
	Message,
} from "../message/Message";
import { createEmptyMockDriver } from "../test/mocks";
import {
	MAX_SEND_ATTEMPTS,
	SendDataRequest,
	SendDataResponse,
	TransmitOptions,
} from "./SendDataMessages";

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

describe("lib/controller/SendDataRequest => ", () => {
	const req = new SendDataRequest(fakeDriver, {
		command: new NoOperationCC(fakeDriver, { nodeId: 1 }),
	});

	it("should be a Message", () => {
		expect(req).toBeInstanceOf(Message);
	});
	it("with type Request", () => {
		expect(getMessageType(req)).toBe(MessageType.Request);
	});
	it("and a function type SendData", () => {
		expect(getFunctionType(req)).toBe(FunctionType.SendData);
	});
	it("that expects a SendDataRequest and SendDataResponse in return", () => {
		const resp = getExpectedResponse(req);
		const cb = getExpectedCallback(req);
		expect(resp).toBe(FunctionType.SendData);
		expect(cb).toBe(FunctionType.SendData);
	});

	describe("the number of send attempts", () => {
		let test: SendDataRequest;

		beforeAll(() => {
			test = new SendDataRequest(fakeDriver, {
				command: new NoOperationCC(fakeDriver, { nodeId: 1 }),
			});
		});

		it("should default to the number configured on the driver", () => {
			expect(test.maxSendAttempts).toBe(
				fakeDriver.options.attempts.sendData,
			);
		});

		it("should not exceed the defined maximum", () => {
			test.maxSendAttempts = MAX_SEND_ATTEMPTS + 1;
			expect(test.maxSendAttempts).toBe(MAX_SEND_ATTEMPTS);
		});

		it("may not be less than 1", () => {
			test.maxSendAttempts = -1;
			expect(test.maxSendAttempts).toBe(1);
		});
	});

	// We cannot parse these kinds of messages atm.
	// it.skip("should extract all properties correctly", () => {
	// 	// an actual message from OZW
	// 	const rawBuf = Buffer.from("010900130b0226022527ca", "hex");
	// 	//                         payload: ID  CC  TXcb
	// 	//                      cc payload: ------^^
	// 	const parsed = new SendDataRequest(undefined);
	// 	parsed.deserialize(rawBuf);

	// 	expect(parsed.command).toBeInstanceOf(CommandClass);
	// 	expect(parsed.command.nodeId).toBe(11);
	// 	expect(parsed.command.ccCommand).toBe(
	// 		CommandClasses["Multilevel Switch"],
	// 	);
	// 	expect(parsed.command.payload).toEqual(Buffer.from([0x02]));

	// 	expect(parsed.transmitOptions).toBe(TransmitOptions.DEFAULT);
	// 	expect(parsed.callbackId).toBe(0x27);
	// });

	// TODO: This should be in the ApplicationCommandRequest tests
	// it.skip("should retrieve the correct CC constructor", () => {
	// 	// we use a NoOP message here as the other CCs aren't implemented yet
	// 	const raw = Buffer.from("010900130d0200002515da", "hex");
	// 	expect(Message.getConstructor(raw)).toBe(SendDataRequest);

	// 	const srq = new SendDataRequest(undefined as any);
	// 	srq.deserialize(raw);
	// 	expect(srq.command).toBeInstanceOf(NoOperationCC);
	// });

	const createRequest = (function* () {
		const noOp = new NoOperationCC(fakeDriver, { nodeId: 2 });
		while (true) yield new SendDataRequest(fakeDriver, { command: noOp });
	})();

	it("new ones should have default transmit options and a numeric callback id", () => {
		const newOne = createRequest.next().value;
		expect(newOne.transmitOptions).toBe(TransmitOptions.DEFAULT);
		expect(newOne.callbackId).toBeNumber();
	});

	it("serialize() should concatenate the serialized CC with transmit options and callback ID", () => {
		const cc = new BasicCCGet(fakeDriver, { nodeId: 1 });
		const serializedCC = cc.serialize();

		const msg = new SendDataRequest(fakeDriver, {
			command: cc,
			callbackId: 66,
		});
		msg.serialize();
		// we don't care about the frame, only the message payload itself
		const serializedMsg = msg.payload;

		const expected = Buffer.concat([
			Buffer.from([
				1, // nodeId
				serializedCC.length, // data length
			]),
			serializedCC,
			Buffer.from([TransmitOptions.DEFAULT, 66]),
		]);
		expect(serializedMsg).toEqual(expected);
	});

	// This is avoided through strictNullChecks
	// it("serialize() should throw when there is no CC", () => {
	// 	const msg = new SendDataRequest(fakeDriver, {});
	// 	assertZWaveError(() => msg.serialize(), {
	// 		messageMatches: "without a command",
	// 		errorCode: ZWaveErrorCodes.PacketFormat_Invalid,
	// 	});
	// });
});

describe("lib/controller/SendDataResponse => ", () => {
	const res = new SendDataResponse(fakeDriver, {} as any);

	it("should be a Message", () => {
		expect(res).toBeInstanceOf(Message);
	});
	it("with type Response", () => {
		expect(getMessageType(res)).toBe(MessageType.Response);
	});
	it("and a function type SendData", () => {
		expect(getFunctionType(res)).toBe(FunctionType.SendData);
	});
	it("that expects NO response", () => {
		expect(getExpectedResponse(res)).toBeUndefined();
	});
});
