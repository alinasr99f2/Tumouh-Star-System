type ExpensePaymentProps = {

  amount: string;

  taxPercent: string;

  tax: number;

  total: number;

  paymentMethod: string;

  paymentSource: string;

  currency: string;

  status: string;

  custodyId: string;

  onAmountChange: (
    value: string
  ) => void;

  onTaxPercentChange: (
    value: string
  ) => void;

  onPaymentMethodChange: (
    value: string
  ) => void;

  onPaymentSourceChange: (
    value: string
  ) => void;

  onCurrencyChange: (
    value: string
  ) => void;

  onStatusChange: (
    value: string
  ) => void;

  onCustodyChange: (
    value: string
  ) => void;

};

export default function ExpensePayment({

  amount,

  taxPercent,

  tax,

  total,

  paymentMethod,

  paymentSource,

  currency,

  status,

  custodyId,

  onAmountChange,

  onTaxPercentChange,

  onPaymentMethodChange,

  onPaymentSourceChange,

  onCurrencyChange,

  onStatusChange,

  onCustodyChange,

}: ExpensePaymentProps) {

  return (

    <>

      <div className="form-section-title">

        بيانات الدفع

      </div>

      <div className="form-grid">

        <div className="form-field">

          <label>

            قيمة المصروف

          </label>

          <input

            type="number"

            min="0"

            step="0.01"

            value={amount}

            onChange={(e)=>

              onAmountChange(
                e.target.value
              )

            }

            placeholder="0.00"

          />

        </div>

        <div className="form-field">

          <label>

            نسبة الضريبة %

          </label>

          <input

            type="number"

            min="0"

            max="100"

            value={taxPercent}

            onChange={(e)=>

              onTaxPercentChange(
                e.target.value
              )

            }

          />

        </div>

        <div className="form-field">

          <label>

            قيمة الضريبة

          </label>

          <input

            value={tax.toFixed(2)}

            readOnly

            className="readonly-input"

          />

        </div>

        <div className="form-field">

          <label>

            الإجمالي

          </label>

          <input

            value={total.toFixed(2)}

            readOnly

            className="readonly-input"

          />

        </div>
                <div className="form-field">

          <label>

            طريقة الدفع

          </label>

          <div className="input-with-button">

            <select

              value={paymentMethod}

              onChange={(e)=>

                onPaymentMethodChange(
                  e.target.value
                )

              }

            >

              <option value="Cash">

                نقدي

              </option>

              <option value="Bank Transfer">

                تحويل بنكي

              </option>

              <option value="Card">

                بطاقة

              </option>

              <option value="Cheque">

                شيك

              </option>

              <option value="Other">

                أخرى

              </option>

            </select>

            <button

              type="button"

              className="small-add-button"

              title="إضافة طريقة دفع"

            >

              +

            </button>

          </div>

        </div>

        <div className="form-field">

          <label>

            جهة الدفع

          </label>

          <select

            value={paymentSource}

            onChange={(e)=>

              onPaymentSourceChange(
                e.target.value
              )

            }

          >

            <option value="">

              اختر

            </option>

            <option value="CashBox">

              الصندوق

            </option>

            <option value="Bank">

              الحساب البنكي

            </option>

            <option value="Custody">

              عهدة

            </option>

          </select>

        </div>

        {paymentSource === "Custody" && (

          <div className="form-field">

            <label>

              حساب العهدة

            </label>

            <select

              value={custodyId}

              onChange={(e)=>

                onCustodyChange(
                  e.target.value
                )

              }

            >

              <option value="">

                اختر العهدة

              </option>

            </select>

          </div>

        )}

        <div className="form-field">

          <label>

            العملة

          </label>

          <select

            value={currency}

            onChange={(e)=>

              onCurrencyChange(
                e.target.value
              )

            }

          >

            <option value="SAR">

              ريال سعودي

            </option>

            <option value="USD">

              دولار أمريكي

            </option>

            <option value="EGP">

              جنيه مصري

            </option>

            <option value="EUR">

              يورو

            </option>

          </select>

        </div>

        <div className="form-field">

          <label>

            الحالة

          </label>

          <select

            value={status}

            onChange={(e)=>

              onStatusChange(
                e.target.value
              )

            }

          >

            <option value="Paid">

              مدفوع

            </option>

            <option value="Pending">

              آجل

            </option>

          </select>

        </div>

      </div>

    </>

  );

}