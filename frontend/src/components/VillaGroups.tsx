import { useState } from "react";

import type {
  Villa,
  VillaCategory,
} from "../data/villas";

import VillaDetailsModal from "./VillaDetailsModal";
import EditVillaModal from "./modals/EditVillaModal";

type VillaGroupsProps = {
  villas: Villa[];
  onUpdateVilla: (villa: Villa) => void;
  onDeleteVilla: (villa: Villa) => void;
};


function VillaGroups({
  villas,
  onUpdateVilla,
  onDeleteVilla,
}: VillaGroupsProps) {

  // =========================
  // SELECTED VILLA
  // =========================

  const [
    selectedVilla,
    setSelectedVilla
  ] = useState<Villa | null>(null);


  // =========================
  // EDIT VILLA
  // =========================

  const [
    editingVilla,
    setEditingVilla
  ] = useState<Villa | null>(null);


  // =========================
  // GROUPS
  // =========================

  const largeVillas = villas.filter(
    (villa) => villa.category === "Large"
  );

  const mediumVillas = villas.filter(
    (villa) => villa.category === "Medium"
  );

  const smallVillas = villas.filter(
    (villa) => villa.category === "Small"
  );


  // =========================
  // CATEGORY NAME
  // =========================

  const categoryName = (
    category: VillaCategory
  ) => {

    if (category === "Large") {
      return "الفلل الكبيرة";
    }

    if (category === "Medium") {
      return "الفلل المتوسطة";
    }

    return "الفلل الصغيرة";

  };


  // =========================
  // OPEN EDIT
  // =========================

  const handleEditVilla = (
    villa: Villa
  ) => {

    setSelectedVilla(null);

    setEditingVilla(villa);

  };


  // =========================
  // SAVE EDIT
  // =========================

  const handleSaveEdit = (
    updatedVilla: Villa
  ) => {

    onUpdateVilla(updatedVilla);

    setEditingVilla(null);

    setSelectedVilla(updatedVilla);

  };


  // =========================
  // RENDER GROUP
  // =========================

  const renderVillaGroup = (
    category: VillaCategory,
    groupVillas: Villa[]
  ) => {

    const totalArea =
      groupVillas.reduce(
        (total, villa) =>
          total + villa.plotArea,
        0
      );


    const totalEstimatedCost =
      groupVillas.reduce(
        (total, villa) =>
          total + villa.estimatedCost,
        0
      );


    const averageArea =
      groupVillas.length > 0
        ? totalArea / groupVillas.length
        : 0;


    return (

      <div
        className={`villa-group ${category.toLowerCase()}`}
      >

        {/* =====================
            HEADER
        ====================== */}

        <div className="villa-group-header">

          <div>

            <span className="villa-group-label">
              {category}
            </span>

            <h3>
              {categoryName(category)}
            </h3>

          </div>


          <div className="villa-group-count">

            <strong>
              {groupVillas.length}
            </strong>

            <span>
              فيلا
            </span>

          </div>

        </div>


        {/* =====================
            TABLE
        ====================== */}

        <div className="villa-table-wrapper">

          <table className="villa-table">

            <thead>

              <tr>

                <th>
                  رقم الفيلا
                </th>

                <th>
                  المساحة (م²)
                </th>

                <th>
                  تكلفة البناء
                </th>

              </tr>

            </thead>


            <tbody>

              {groupVillas.length === 0 ? (

                <tr>

                  <td colSpan={3}>
                    لا توجد فلل في هذه الفئة
                  </td>

                </tr>

              ) : (

                groupVillas.map((villa) => (

                  <tr
                    key={villa.code}
                    className="villa-row"
                  >

                    <td>

                      <button
                        type="button"
                        className="villa-code-button"
                        onClick={() =>
                          setSelectedVilla(villa)
                        }
                      >
                        {villa.code}
                      </button>

                    </td>


                    <td>

                      <strong>
                        {villa.plotArea.toLocaleString()}
                      </strong>

                    </td>


                    <td>

                      {villa.estimatedCost > 0
                        ? `${villa.estimatedCost.toLocaleString()} ريال`
                        : "—"}

                    </td>

                  </tr>

                ))

              )}

            </tbody>


            <tfoot>

              <tr>

                <td>
                  الإجمالي
                </td>

                <td>
                  {totalArea.toLocaleString()} م²
                </td>

                <td>

                  {totalEstimatedCost > 0
                    ? `${totalEstimatedCost.toLocaleString()} ريال`
                    : "—"}

                </td>

              </tr>

            </tfoot>

          </table>

        </div>


        {/* =====================
            SUMMARY
        ====================== */}

        <div className="villa-group-summary">

          <div>

            <span>
              عدد الفلل
            </span>

            <strong>
              {groupVillas.length}
            </strong>

          </div>


          <div>

            <span>
              متوسط المساحة
            </span>

            <strong>
              {averageArea.toFixed(1)} م²
            </strong>

          </div>


          <div>

            <span>
              تكلفة البناء
            </span>

            <strong>

              {totalEstimatedCost > 0
                ? `${totalEstimatedCost.toLocaleString()} ريال`
                : "غير مدخلة"}

            </strong>

          </div>

        </div>

      </div>

    );

  };


  // =========================
  // DISPLAY
  // =========================

  return (

    <>

      <section className="villa-groups-section">

        <div className="section-heading">

          <div>

            <span className="section-label">
              تفاصيل الفلل
            </span>

            <h2>
              توزيع الفلل حسب الفئة
            </h2>

          </div>

        </div>


        <div className="villa-groups-grid">

          {renderVillaGroup(
            "Large",
            largeVillas
          )}

          {renderVillaGroup(
            "Medium",
            mediumVillas
          )}

          {renderVillaGroup(
            "Small",
            smallVillas
          )}

        </div>

      </section>


      {/* =========================
          VILLA DETAILS
      ========================= */}

      <VillaDetailsModal
  villa={selectedVilla}
  onClose={() =>
    setSelectedVilla(null)
  }
  onEdit={handleEditVilla}
  onDelete={(villa) => {
    onDeleteVilla(villa);
    setSelectedVilla(null);
  }}
/>


      {/* =========================
          EDIT VILLA
      ========================= */}

      <EditVillaModal
        villa={editingVilla}
        onClose={() =>
          setEditingVilla(null)
        }
        onSave={handleSaveEdit}
      />

    </>

  );

}

export default VillaGroups;